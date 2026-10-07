import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveLocation } from "./useLiveLocation";

const mocks = vi.hoisted(() => ({
  share: vi.fn(),
  stop: vi.fn(),
  friends: vi.fn(),
}));
vi.mock("./actions", () => ({
  shareLocationAction: mocks.share,
  stopSharingAction: mocks.stop,
  friendLocationsAction: mocks.friends,
}));

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;
const geo = { watchSuccess: null as Success | null, watchError: null as Failure | null };

function fix(lat: number, lng: number, accuracy = 8): GeolocationPosition {
  return { coords: { latitude: lat, longitude: lng, accuracy } } as GeolocationPosition;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.friends.mockResolvedValue([]);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      watchPosition: vi.fn((success: Success, error: Failure) => {
        geo.watchSuccess = success;
        geo.watchError = error;
        return 7;
      }),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn((success: Success) => success(fix(47.26, 11.39))),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLiveLocation", () => {
  it("shows my own position only after I ask, without sending it anywhere", () => {
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: null, initialFriends: [] }));
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();

    act(() => result.current.locate());
    expect(result.current.locating).toBe(true);
    act(() => geo.watchSuccess?.(fix(47.2, 11.3)));

    expect(result.current.me).toEqual({ lat: 47.2, lng: 11.3, accuracy: 8 });
    expect(result.current.locating).toBe(false);
    expect(mocks.share).not.toHaveBeenCalled();
  });

  it("explains a blocked permission", () => {
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: null, initialFriends: [] }));
    act(() => result.current.locate());
    act(() => geo.watchError?.({ code: 1 } as GeolocationPositionError));
    expect(result.current.error).toBe("loc.denied");
    expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(7);
  });

  it("starts sharing with a fresh position and then refreshes it", async () => {
    mocks.share.mockResolvedValue("sharing");
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: null, initialFriends: [] }));

    let ok = false;
    await act(async () => {
      ok = await result.current.startSharing(60);
    });
    expect(ok).toBe(true);
    expect(mocks.share).toHaveBeenCalledWith({ lat: 47.26, lng: 11.39, accuracy: 8 }, 60);
    expect(result.current.sharingEnd).not.toBeNull();
    expect(navigator.geolocation.watchPosition).toHaveBeenCalled();
  });

  it("reports why sharing was refused", async () => {
    mocks.share.mockResolvedValue("profile_incomplete");
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: null, initialFriends: [] }));
    await act(async () => {
      await result.current.startSharing(60);
    });
    expect(result.current.error).toBe("common.profileIncomplete");
    expect(result.current.sharingEnd).toBeNull();
  });

  it("resumes GPS when sharing was already on and stops on request", async () => {
    mocks.stop.mockResolvedValue(true);
    const end = new Date(Date.now() + 600_000).toISOString();
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: end, initialFriends: [] }));
    expect(navigator.geolocation.watchPosition).toHaveBeenCalled();

    mocks.share.mockResolvedValue("sharing");
    act(() => geo.watchSuccess?.(fix(47.3, 11.4)));
    await waitFor(() => expect(mocks.share).toHaveBeenCalledWith({ lat: 47.3, lng: 11.4, accuracy: 8 }, null));

    await act(async () => {
      await result.current.stopSharing();
    });
    expect(result.current.sharingEnd).toBeNull();
  });

  it("polls friends' positions", async () => {
    vi.useFakeTimers();
    mocks.friends.mockResolvedValue([{ userId: "f", name: "Max", handle: "max", lat: 1, lng: 2, accuracy: 3, updatedAt: "x" }]);
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: null, initialFriends: null }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(result.current.friends).toHaveLength(1);
  });
});

describe("locateOnce", () => {
  it("returns one fix without keeping it or starting a watch", async () => {
    mocks.friends.mockResolvedValue([]);
    const { result } = renderHook(() => useLiveLocation({ initialSharingEnd: null, initialFriends: [] }));
    let position: unknown = null;
    await act(async () => { position = await result.current.locateOnce(); });
    expect(position).toEqual({ lat: 47.26, lng: 11.39, accuracy: 8 });
    expect(result.current.me).toBeNull();
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
  });
});
