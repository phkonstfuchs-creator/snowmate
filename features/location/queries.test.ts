import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCanShareLocation, getFriendLocations, getMySharingEnd } from "./queries";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe("location queries", () => {
  it("reads when my sharing ends", async () => {
    mocks.rpc.mockResolvedValue({ data: "2026-01-01T12:00:00Z", error: null });
    await expect(getMySharingEnd()).resolves.toBe("2026-01-01T12:00:00Z");
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(getMySharingEnd()).resolves.toBeNull();
    mocks.createClient.mockRejectedValue(new Error("offline"));
    await expect(getMySharingEnd()).resolves.toBeNull();
  });

  it("lists friends' positions", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(getFriendLocations()).resolves.toEqual([]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_friend_locations");
  });

  it("asks the database whether I may share; unknown keeps the button", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(getCanShareLocation()).resolves.toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith("can_share_my_location");
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(getCanShareLocation()).resolves.toBe(true);
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST" } });
    await expect(getCanShareLocation()).resolves.toBe(true);
  });
});
