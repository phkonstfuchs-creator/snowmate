import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: true, share: vi.fn(), stopWatch: vi.fn(),
  onFix: null as null | ((fix: { lat: number; lng: number; accuracy: number }) => void),
  onError: null as null | ((error: "denied" | "unavailable") => void),
}));
vi.mock("@/features/tracking/position-source", () => ({
  hasBackgroundLocation: () => mocks.native,
  watchPositions: (onFix: typeof mocks.onFix, onError: typeof mocks.onError) => {
    mocks.onFix = onFix;
    mocks.onError = onError;
    return { stop: mocks.stopWatch };
  },
}));
vi.mock("./actions", () => ({ shareLocationAction: mocks.share }));

import { isBackgroundSharing, onBackgroundSharing, resumeBackgroundSharing, startBackgroundSharing, stopBackgroundSharing } from "./background-sharing";

const TEXTS = { title: "Sharing", message: "Until you stop" };
const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = true;
  mocks.share.mockResolvedValue("updated");
  window.localStorage.clear();
});
afterEach(() => {
  stopBackgroundSharing();
  vi.useRealTimers();
});

describe("background sharing", () => {
  it("does nothing on the web", () => {
    mocks.native = false;
    expect(startBackgroundSharing(inOneHour(), TEXTS)).toBe(false);
    expect(isBackgroundSharing()).toBe(false);
  });

  it("sends fixes, tells listeners and survives a second start", async () => {
    const events: unknown[] = [];
    const off = onBackgroundSharing((event) => events.push(event));
    expect(startBackgroundSharing(inOneHour(), TEXTS)).toBe(true);
    expect(startBackgroundSharing(inOneHour(), TEXTS)).toBe(true);
    mocks.onFix!({ lat: 47.31, lng: 11.38, accuracy: 9 });
    expect(mocks.share).toHaveBeenCalledTimes(1);
    expect(mocks.share).toHaveBeenCalledWith({ lat: 47.31, lng: 11.38, accuracy: 9 }, null);
    expect(events).toEqual([{ type: "position", position: { lat: 47.31, lng: 11.38, accuracy: 9 } }]);
    off();
  });

  it("stops when the server says sharing ended, and on a denied permission", async () => {
    const events: unknown[] = [];
    onBackgroundSharing((event) => events.push(event));
    mocks.share.mockResolvedValue("invalid");
    startBackgroundSharing(inOneHour(), TEXTS);
    mocks.onFix!({ lat: 47.31, lng: 11.38, accuracy: 9 });
    await vi.waitFor(() => expect(events).toContainEqual({ type: "ended" }));
    expect(isBackgroundSharing()).toBe(false);

    startBackgroundSharing(inOneHour(), TEXTS);
    mocks.onError!("denied");
    expect(isBackgroundSharing()).toBe(false);
    expect(events).toContainEqual({ type: "error", error: "denied" });
  });

  it("ends by itself at the chosen time and resumes after a restart", () => {
    vi.useFakeTimers();
    const events: unknown[] = [];
    onBackgroundSharing((event) => events.push(event));
    startBackgroundSharing(new Date(Date.now() + 60_000).toISOString(), TEXTS);
    vi.advanceTimersByTime(60_000);
    expect(isBackgroundSharing()).toBe(false);
    expect(events).toContainEqual({ type: "ended" });
    expect(resumeBackgroundSharing(TEXTS)).toBe(false);

    const end = inOneHour();
    startBackgroundSharing(end, TEXTS);
    mocks.stopWatch.mockClear();
    // a restart forgets the module state but keeps the stored end
    stopBackgroundSharing();
    window.localStorage.setItem("pistl.sharingEnd", end);
    expect(resumeBackgroundSharing(TEXTS)).toBe(true);
  });
});
