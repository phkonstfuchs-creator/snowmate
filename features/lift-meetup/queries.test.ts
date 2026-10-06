import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCanShareLiftMeetup, getFriendLiftMeetups, getMyLiftMeetup } from "./queries";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe("lift meetup queries", () => {
  it("requires explicit server eligibility before offering location-revealing share", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST" } });
    await expect(getCanShareLiftMeetup()).resolves.toBe(false);
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(getCanShareLiftMeetup()).resolves.toBe(false);
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(getCanShareLiftMeetup()).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("can_share_my_location");
  });

  it("reads status through only the dedicated security-definer functions", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getMyLiftMeetup()).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith("my_lift_meetup");
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getFriendLiftMeetups()).resolves.toEqual([]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_friend_lift_meetups");
  });
});
