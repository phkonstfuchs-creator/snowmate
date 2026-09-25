import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateCarpoolInput } from "./carpool-input";
import { LOCKED_DEPARTURE_LABEL, toLiveCarpool, type CarpoolRow } from "./live-carpool";
import { listCarpools } from "./queries";
import {
  cancelCarpoolAction,
  createCarpoolAction,
  requestCarpoolAction,
  respondCarpoolRequestAction,
  withdrawCarpoolRequestAction,
} from "./actions";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), insert: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const NOW = new Date(2027, 0, 8, 9);

export const row: CarpoolRow = {
  id: "c1",
  author_id: "a1",
  author_display_name: "Lena Moser",
  author_handle: "lena_m",
  role: "driver",
  resort: "Stubai Glacier",
  city: "innsbruck",
  ride_date: "2027-01-09",
  departure_point: null,
  departure_point_locked: true,
  departure_time: "07:30:00",
  seats: 3,
  seats_taken: 1,
  note: null,
  created_at: "2027-01-08T07:00:00Z",
  is_author: false,
  my_request: null,
  requests: [],
};

const input = {
  role: "driver",
  resort: "Stubai Glacier",
  city: "innsbruck",
  rideDate: "2027-01-09",
  departurePoint: " Innsbruck Hbf ",
  departureTime: "07:30",
  seats: 3,
  note: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc, from: vi.fn(() => ({ insert: mocks.insert })) });
});

describe("toLiveCarpool", () => {
  it("maps a locked row", () => {
    const pool = toLiveCarpool(row, NOW);
    expect(pool.post).toMatchObject({
      departurePoint: LOCKED_DEPARTURE_LABEL,
      departureTime: "07:30",
      totalSeats: 3,
      availableSeats: 2,
      note: "",
      riders: [],
    });
    expect(pool.dateLabel).toBe("Tomorrow");
    expect(pool.departureLocked).toBe(true);
    expect(pool.author.name).toBe("Lena Moser");
  });

  it("keeps requests and counts accepted riders", () => {
    const pool = toLiveCarpool(
      {
        ...row,
        departure_point: "Hbf",
        departure_point_locked: false,
        is_author: true,
        seats_taken: 5,
        requests: [
          { user_id: "u1", display_name: "Max", handle: "max", status: "accepted" },
          { user_id: "u2", display_name: null, handle: "jo", status: "pending" },
        ],
      },
      NOW,
    );
    expect(pool.post.availableSeats).toBe(0);
    expect(pool.post.riders).toEqual(["u1"]);
    expect(pool.requests.map((r) => r.user.name)).toEqual(["Max", "jo"]);
  });
});

describe("validateCarpoolInput", () => {
  it("normalises valid input", () => {
    expect(validateCarpoolInput(input)).toMatchObject({ success: true, data: { departurePoint: "Innsbruck Hbf", note: null } });
  });

  it.each([
    [{ resort: "" }, "Pick a resort."],
    [{ departurePoint: "x" }, "Add a pickup spot."],
    [{ seats: 9 }, "At most 8 seats."],
    [{ departureTime: "7:30" }, "Pick a time."],
  ])("rejects %j", (patch, message) => {
    expect(validateCarpoolInput({ ...input, ...patch })).toEqual({ success: false, message });
  });
});

describe("listCarpools", () => {
  it("maps rows and fails soft", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [row], error: null });
    expect((await listCarpools(NOW))?.[0]?.post.id).toBe("c1");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(listCarpools()).resolves.toBeNull();
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(listCarpools()).resolves.toBeNull();
  });
});

describe("carpool actions", () => {
  it("creates a post without an author id", async () => {
    mocks.insert.mockResolvedValue({ error: null });
    await expect(createCarpoolAction(input)).resolves.toEqual({ ok: true, message: "Posted." });
    expect(mocks.insert.mock.calls[0]![0]).not.toHaveProperty("author_id");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/carpool");
  });

  it("rejects invalid input and database errors", async () => {
    await expect(createCarpoolAction({ ...input, seats: 0 })).resolves.toMatchObject({ ok: false });
    mocks.insert.mockResolvedValueOnce({ error: { code: "42501" } });
    await expect(createCarpoolAction(input)).resolves.toMatchObject({ message: expect.stringContaining("Finish your profile") });
    mocks.insert.mockResolvedValueOnce({ error: { code: "x" } });
    await expect(createCarpoolAction(input)).resolves.toMatchObject({ ok: false });
    mocks.insert.mockRejectedValueOnce(new Error("offline"));
    await expect(createCarpoolAction(input)).resolves.toMatchObject({ ok: false });
  });

  it.each([
    ["requested", true],
    ["full", false],
    ["profile_incomplete", false],
    ["unknown", false],
  ])("maps request status %s", async (data, ok) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    await expect(requestCarpoolAction("c1")).resolves.toMatchObject({ ok });
    expect(mocks.rpc).toHaveBeenCalledWith("request_carpool", { target_carpool: "c1" });
  });

  it("responds to requests", async () => {
    mocks.rpc.mockResolvedValue({ data: "accepted", error: null });
    await expect(respondCarpoolRequestAction("c1", "u1", true)).resolves.toEqual({ ok: true, message: "Confirmed." });
    expect(mocks.rpc).toHaveBeenCalledWith("respond_carpool_request", { target_carpool: "c1", requester: "u1", accept: true });
  });

  it("withdraws and cancels", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(withdrawCarpoolRequestAction("c1")).resolves.toMatchObject({ ok: true });
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(withdrawCarpoolRequestAction("c1")).resolves.toMatchObject({ ok: false });
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(cancelCarpoolAction("c1")).resolves.toMatchObject({ ok: true });
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(cancelCarpoolAction("c1")).resolves.toMatchObject({ ok: false });
  });

  it("fails closed when the rpc errors or throws", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(withdrawCarpoolRequestAction("c1")).resolves.toMatchObject({ ok: false });
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(cancelCarpoolAction("c1")).resolves.toMatchObject({ ok: false });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(requestCarpoolAction("c1")).resolves.toMatchObject({ ok: false });
  });
});
