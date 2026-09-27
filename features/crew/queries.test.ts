import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFriendGraph, getPendingCounts } from "./queries";

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

describe("getPendingCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  it("reads the counts", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ friend_requests: 2, carpool_requests: 1 }], error: null });
    await expect(getPendingCounts()).resolves.toEqual({ friendRequests: 2, carpoolRequests: 1 });
  });

  it("falls back to zero", async () => {
    const zero = { friendRequests: 0, carpoolRequests: 0 };
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(getPendingCounts()).resolves.toEqual(zero);
    mocks.rpc.mockResolvedValueOnce({ data: [{ friend_requests: null, carpool_requests: "x" }], error: null });
    await expect(getPendingCounts()).resolves.toEqual(zero);
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(getPendingCounts()).resolves.toEqual(zero);
  });
});
