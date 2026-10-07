import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  share: vi.fn(), stop: vi.fn(), friends: vi.fn(),
  background: false, watch: vi.fn(), stopWatch: vi.fn(),
  onFix: null as null | ((fix: { lat: number; lng: number; accuracy: number }) => void),
}));
vi.mock("./actions", () => ({ shareLocationAction: mocks.share, stopSharingAction: mocks.stop, friendLocationsAction: mocks.friends }));
vi.mock("@/features/tracking/position-source", () => ({
  hasBackgroundLocation: () => mocks.background,
  watchPositions: (onFix: typeof mocks.onFix, _onError: unknown, texts: unknown) => {
    mocks.onFix = onFix;
    mocks.watch(texts);
    return { stop: mocks.stopWatch };
  },
}));

import { useLiveLocation } from "./useLiveLocation";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.background = false;
  mocks.onFix = null;
  mocks.friends.mockResolvedValue([]);
  mocks.share.mockResolvedValue("updated");
});

describe("useLiveLocation in the store app", () => {
  it("keeps sending positions in the background while sharing", async () => {
    mocks.background = true;
    const end = new Date(Date.now() + 3_600_000).toISOString();
    const { unmount } = renderHook(() => useLiveLocation({ initialSharingEnd: end, initialFriends: [] }));
    await waitFor(() => expect(mocks.watch).toHaveBeenCalledWith(expect.objectContaining({ title: expect.any(String) })));

    mocks.onFix!({ lat: 47.31, lng: 11.38, accuracy: 9 });
    await waitFor(() => expect(mocks.share).toHaveBeenCalledWith({ lat: 47.31, lng: 11.38, accuracy: 9 }, null));
    unmount();
    expect(mocks.stopWatch).toHaveBeenCalled();
  });

  it("does not watch in the background when not sharing or on the web", () => {
    mocks.background = true;
    renderHook(() => useLiveLocation({ initialSharingEnd: null, initialFriends: [] }));
    mocks.background = false;
    renderHook(() => useLiveLocation({ initialSharingEnd: new Date(Date.now() + 60_000).toISOString(), initialFriends: [] }));
    expect(mocks.watch).not.toHaveBeenCalled();
  });
});
