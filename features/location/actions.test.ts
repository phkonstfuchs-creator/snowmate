import { beforeEach, describe, expect, it, vi } from "vitest";
import { friendLocationsAction, shareLocationAction, stopSharingAction } from "./actions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe("location actions", () => {
  it("sends only the position and duration; identity comes from the session", async () => {
    mocks.rpc.mockResolvedValue({ data: "sharing", error: null });
    await expect(shareLocationAction({ lat: 47.2, lng: 11.3, accuracy: 12.7 }, 60)).resolves.toBe("sharing");
    expect(mocks.rpc).toHaveBeenCalledWith("share_my_location", { p_lat: 47.2, p_lng: 11.3, p_accuracy: 13, p_minutes: 60 });
  });

  it("refuses invalid input before calling the database", async () => {
    await expect(shareLocationAction({ lat: 200, lng: 11, accuracy: 1 }, 60)).resolves.toBe("invalid");
    await expect(shareLocationAction({ lat: 47, lng: 11, accuracy: 1 }, 9999)).resolves.toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed on errors and unknown answers", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST" } });
    await expect(shareLocationAction({ lat: 47, lng: 11, accuracy: null }, null)).resolves.toBe("unavailable");
    mocks.rpc.mockResolvedValue({ data: "surprise", error: null });
    await expect(shareLocationAction({ lat: 47, lng: 11, accuracy: null }, null)).resolves.toBe("unavailable");
    mocks.createClient.mockRejectedValue(new Error("offline"));
    await expect(shareLocationAction({ lat: 47, lng: 11, accuracy: null }, null)).resolves.toBe("unavailable");
    await expect(stopSharingAction()).resolves.toBe(false);
    await expect(friendLocationsAction()).resolves.toBeNull();
  });

  it("stops sharing and lists friends", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(stopSharingAction()).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("stop_sharing_location");

    mocks.rpc.mockResolvedValueOnce({
      data: [{ user_id: "f", display_name: "Max", handle: "max", lat: 47, lng: 11, accuracy_m: 9, updated_at: "2026-01-01T10:00:00Z" }],
      error: null,
    });
    await expect(friendLocationsAction()).resolves.toEqual([
      { userId: "f", name: "Max", handle: "max", lat: 47, lng: 11, accuracy: 9, updatedAt: "2026-01-01T10:00:00Z" },
    ]);
  });
});
