import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelRideAction, createRideAction, joinRideAction, leaveRideAction, respondRideRequestAction, updateRideAction } from "./actions";

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-08T08:00:00Z"));
    mocks.createClient.mockResolvedValue({
      from: vi.fn(() => ({ insert: mocks.insert })),
      rpc: mocks.rpc,
    });
  });
  afterEach(() => vi.useRealTimers());

  describe("createRideAction", () => {
    it("inserts without a host id and revalidates the ride screens", async () => {
      mocks.insert.mockResolvedValue({ error: null });

      await expect(createRideAction(ride)).resolves.toEqual({ ok: true, message: "Ride posted." });
      const inserted = mocks.insert.mock.calls[0]![0];
      expect(inserted).not.toHaveProperty("host_id");
      expect(inserted).toMatchObject({ title: "Park day", caption: null, visibility: "public" });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
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

    it("refuses a far-future ride before inserting it", async () => {
      await expect(createRideAction({ ...ride, rideDate: "9999-01-01" })).resolves.toEqual({
        ok: false,
        message: "Choose a date within the next 365 days.",
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
      ["requested", true, "Asked. The host lets you in."],
      ["full", false, "This ride is full."],
      ["not_found", false, "This ride is no longer available."],
      ["profile_incomplete", false, "Finish your profile first: add your name and handle on the Profile tab."],
      ["something_new", false, "That did not work. Try again shortly."],
    ])("maps %s", async (status, ok, message) => {
      mocks.rpc.mockResolvedValue({ data: status, error: null });
      await expect(joinRideAction("ride-1")).resolves.toMatchObject({ ok, message });
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

  describe("updateRideAction", () => {
    const edit = { meetTime: "10:30", meetPoint: " Hungerburg ", totalSpots: 3, caption: "" };

    it("sends the trimmed edit to update_ride", async () => {
      mocks.rpc.mockResolvedValue({ data: "updated", error: null });
      await expect(updateRideAction("r1", edit)).resolves.toEqual({ ok: true, message: "Ride updated." });
      expect(mocks.rpc).toHaveBeenCalledWith("update_ride", {
        target_ride: "r1",
        new_meet_time: "10:30",
        new_meet_point: "Hungerburg",
        new_total_spots: 3,
        new_caption: "",
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it.each([
      ["below_taken", "More people have already joined than that. Pick more spots."],
      ["not_found", "Only the host can edit this ride."],
    ])("explains %s", async (data, message) => {
      mocks.rpc.mockResolvedValue({ data, error: null });
      await expect(updateRideAction("r1", edit)).resolves.toEqual({ ok: false, message });
    });

    it("rejects invalid input and failures", async () => {
      await expect(updateRideAction("r1", { ...edit, meetTime: "25:00" })).resolves.toEqual({ ok: false, message: "Pick a time." });
      await expect(updateRideAction("", edit)).resolves.toMatchObject({ ok: false });
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
      await expect(updateRideAction("r1", edit)).resolves.toMatchObject({ ok: false });
      mocks.createClient.mockRejectedValueOnce(new Error("env"));
      await expect(updateRideAction("r1", edit)).resolves.toMatchObject({ ok: false });
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("respondRideRequestAction", () => {
    it.each([
      ["accepted", true],
      ["declined", true],
      ["full", false],
      ["not_found", false],
      ["weird", false],
    ])("maps %s", async (data, ok) => {
      mocks.rpc.mockResolvedValue({ data, error: null });
      await expect(respondRideRequestAction("r1", "u1", true)).resolves.toMatchObject({ ok });
      expect(mocks.rpc).toHaveBeenCalledWith("respond_ride_request", { target_ride: "r1", requester: "u1", accept: true });
    });

    it("fails closed", async () => {
      await expect(respondRideRequestAction("", "u1", true)).resolves.toMatchObject({ ok: false });
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
      await expect(respondRideRequestAction("r1", "u1", false)).resolves.toMatchObject({ ok: false });
      mocks.createClient.mockRejectedValueOnce(new Error("env"));
      await expect(respondRideRequestAction("r1", "u1", false)).resolves.toMatchObject({ ok: false });
    });
  });
});
