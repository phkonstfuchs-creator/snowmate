import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFriendGraph, getNavCounts } from "./queries";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

describe("getFriendGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  it("groups the caller's friendships", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ user_id: "a", display_name: "A", handle: "a_a", city: null, ability_level: null, status: "accepted", direction: "incoming" }],
      error: null,
    });
    const graph = await getFriendGraph();
    expect(graph?.friends).toHaveLength(1);
    expect(mocks.rpc).toHaveBeenCalledWith("list_my_friendships");
  });

  it("returns null when unavailable", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(getFriendGraph()).resolves.toBeNull();
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(getFriendGraph()).resolves.toBeNull();
  });
});

describe("getNavCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  it("reads every badge and the age flag in one call", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ friend_requests: 2, carpool_requests: 1, ride_requests: 3, unread_chats: 4, age_outdated: true }],
      error: null,
    });
    await expect(getNavCounts()).resolves.toEqual({
      pending: { friendRequests: 2, carpoolRequests: 1, rideRequests: 3 },
      unreadChats: 4,
      ageOutdated: true,
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("my_nav_counts");
  });

  it("shows no badges and asks for no age write on failure", async () => {
    const empty = { pending: { friendRequests: 0, carpoolRequests: 0, rideRequests: 0 }, unreadChats: 0, ageOutdated: false };
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(getNavCounts()).resolves.toEqual(empty);
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(getNavCounts()).resolves.toEqual(empty);
  });
});
