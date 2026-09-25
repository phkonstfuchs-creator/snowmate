import { beforeEach, describe, expect, it, vi } from "vitest";
import { listRides } from "./queries";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

describe("listRides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  it("maps the rows from list_rides", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: "r1", host_id: "h", host_display_name: "Lena", host_handle: "lena", host_is_minor: false,
          resort: "Nordkette", city: "innsbruck", ability_level: "chill", ride_date: "2027-01-08",
          meet_time: "09:00:00", meet_point: null, meet_point_locked: true, total_spots: 3, taken_spots: 0,
          caption: null, title: null, visibility: "friends", created_at: "2027-01-08T08:00:00Z",
          is_host: false, is_joined: false, participants: [],
        },
      ],
      error: null,
    });

    const result = await listRides(new Date("2027-01-08T10:00:00Z"));
    expect(mocks.rpc).toHaveBeenCalledWith("list_rides");
    expect(result.status === "ok" && result.rides[0]?.post.resort).toBe("Nordkette");
  });

  it("is unavailable on an error, a non-array or a throw", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(listRides()).resolves.toEqual({ status: "unavailable" });
    mocks.rpc.mockResolvedValueOnce({ data: {}, error: null });
    await expect(listRides()).resolves.toEqual({ status: "unavailable" });
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(listRides()).resolves.toEqual({ status: "unavailable" });
  });
});
