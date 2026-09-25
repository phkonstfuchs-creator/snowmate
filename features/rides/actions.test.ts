import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelRideAction, createRideAction, joinRideAction, leaveRideAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const ride = {
  resort: "Nordkette",
  city: "innsbruck",
  abilityLevel: "park",
  rideDate: "2027-01-09",
  meetTime: "09:30",
  meetPoint: "Congress station",
  totalSpots: 4,
  caption: "",
  visibility: "public",
  title: "Park day",
};

describe("ride actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      from: vi.fn(() => ({ insert: mocks.insert })),
      rpc: mocks.rpc,
    });
  });

  describe("createRideAction", () => {
    it("inserts without a host id and revalidates the ride screens", async () => {
      mocks.insert.mockResolvedValue({ error: null });

      await expect(createRideAction(ride)).resolves.toEqual({ ok: true, message: "Ride posted." });
      const inserted = mocks.insert.mock.calls[0]![0];
      expect(inserted).not.toHaveProperty("host_id");
      expect(inserted).toMatchObject({ title: "Park day", caption: null, visibility: "public" });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/feed");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/events");
    });

    it("drops the title on a friends ride", async () => {
      mocks.insert.mockResolvedValue({ error: null });
      await createRideAction({ ...ride, visibility: "friends" });
      expect(mocks.insert.mock.calls[0]![0].title).toBeNull();
    });

    it("rejects invalid input before touching the database", async () => {
      await expect(createRideAction({ ...ride, meetPoint: "" })).resolves.toEqual({
        ok: false,
        message: "Add a meeting point.",
      });
      expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it("explains the minor rule when the database enforces it", async () => {
      mocks.insert.mockResolvedValue({ error: { message: "minors cannot host public rides" } });
      await expect(createRideAction(ride)).resolves.toEqual({
        ok: false,
        message: "Public events are 18 and over only.",
      });
    });

    it("asks for a finished profile when the insert policy refuses", async () => {
      mocks.insert.mockResolvedValue({ error: { code: "42501", message: "new row violates row-level security policy" } });
      await expect(createRideAction(ride)).resolves.toMatchObject({ ok: false, message: expect.stringContaining("Finish your profile") });
    });

    it.each([
      ["a database error", () => mocks.insert.mockResolvedValue({ error: { message: "boom" } })],
      ["a thrown error", () => mocks.insert.mockRejectedValue(new Error("offline"))],
    ])("reports %s as unavailable", async (_label, arrange) => {
      arrange();
      const result = await createRideAction(ride);
      expect(result.ok).toBe(false);
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("joinRideAction", () => {
    it.each([
      ["joined", true, "You are in."],
      ["full", false, "This ride is full."],
      ["not_found", false, "This ride is no longer available."],
      ["profile_incomplete", false, "Finish your profile first: add your name and handle on the Profile tab."],
      ["something_new", false, "That did not work. Try again shortly."],
    ])("maps %s", async (status, ok, message) => {
      mocks.rpc.mockResolvedValue({ data: status, error: null });
      await expect(joinRideAction("ride-1")).resolves.toEqual({ ok, message });
      expect(mocks.rpc).toHaveBeenCalledWith("join_ride", { target_ride: "ride-1" });
    });

    it("fails closed on an rpc error or an empty id", async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
      await expect(joinRideAction("ride-1")).resolves.toMatchObject({ ok: false });
      await expect(joinRideAction("")).resolves.toMatchObject({ ok: false });
      mocks.createClient.mockRejectedValueOnce(new Error("env"));
      await expect(joinRideAction("ride-1")).resolves.toMatchObject({ ok: false });
    });
  });

  describe("leaveRideAction and cancelRideAction", () => {
    it("reports success and refusal", async () => {
      mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
      await expect(leaveRideAction("r")).resolves.toEqual({ ok: true, message: "You left the ride." });
      mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
      await expect(leaveRideAction("r")).resolves.toMatchObject({ ok: false });
      mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
      await expect(cancelRideAction("r")).resolves.toEqual({ ok: true, message: "Ride cancelled." });
      mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
      await expect(cancelRideAction("r")).resolves.toEqual({ ok: false, message: "Only the host can cancel this ride." });
    });

    it("reports failures as unavailable", async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code: "x" } });
      await expect(leaveRideAction("r")).resolves.toMatchObject({ ok: false });
      await expect(cancelRideAction("r")).resolves.toMatchObject({ ok: false });
    });
  });
});
