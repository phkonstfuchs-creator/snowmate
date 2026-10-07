import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  share: vi.fn(), stop: vi.fn(), friends: vi.fn(),
  native: false, start: vi.fn(), stopBg: vi.fn(),
  listener: null as null | ((event: unknown) => void),
}));
vi.mock("./actions", () => ({ shareLocationAction: mocks.share, stopSharingAction: mocks.stop, friendLocationsAction: mocks.friends }));
vi.mock("@/features/tracking/position-source", () => ({ hasBackgroundLocation: () => mocks.native }));
vi.mock("./background-sharing", () => ({
  isBackgroundSharing: () => mocks.native,
  startBackgroundSharing: (...args: unknown[]) => { mocks.start(...args); return mocks.native; },
  stopBackgroundSharing: mocks.stopBg,
  onBackgroundSharing: (listener: (event: unknown) => void) => { mocks.listener = listener; return () => undefined; },
}));

import { useLiveLocation } from "./useLiveLocation";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = true;
  mocks.friends.mockResolvedValue([]);
  mocks.stop.mockResolvedValue(true);
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { watchPosition: vi.fn(() => 1), clearWatch: vi.fn(), getCurrentPosition: vi.fn() } });
});

describe("useLiveLocation in the store app", () => {
  it("hands a running share to the background watcher and shows its positions", async () => {
    const end = new Date(Date.now() + 3_600_000).toISOString();
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: end, initialFriends: [] }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledWith(end, expect.objectContaining({ title: expect.any(String) })));
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();

    act(() => mocks.listener!({ type: "position", position: { lat: 47.31, lng: 11.38, accuracy: 9 } }));
    expect(result.current.me).toEqual({ lat: 47.31, lng: 11.38, accuracy: 9 });
    expect(mocks.share).not.toHaveBeenCalled();
  });

  it("shows background failures and ends with the watcher", () => {
    const end = new Date(Date.now() + 3_600_000).toISOString();
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: end, initialFriends: [] }));
    act(() => mocks.listener!({ type: "error", error: "denied" }));
    expect(result.current.error).toBe("loc.backgroundDenied");
    act(() => mocks.listener!({ type: "ended" }));
    expect(result.current.sharingEnd).toBeNull();
  });

  it("stops the background watcher on Stop", async () => {
    const end = new Date(Date.now() + 3_600_000).toISOString();
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: end, initialFriends: [] }));
    await act(() => result.current.stopSharing());
    expect(mocks.stopBg).toHaveBeenCalled();
  });
});
