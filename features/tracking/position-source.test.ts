import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: false,
  addWatcher: vi.fn(),
  removeWatcher: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native, isPluginAvailable: () => mocks.native },
  registerPlugin: () => ({ addWatcher: mocks.addWatcher, removeWatcher: mocks.removeWatcher }),
}));

import { fixFromNative, hasPositionSource, watchPositions } from "./position-source";

const TEXTS = { title: "Recording", message: "Tap to open" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = false;
  mocks.removeWatcher.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("browser positions", () => {
  it("maps fixes and errors and clears the watch", () => {
    let success: PositionCallback = () => undefined;
    let failure: PositionErrorCallback = () => undefined;
    const geolocation = {
      watchPosition: vi.fn((ok: PositionCallback, err: PositionErrorCallback) => { success = ok; failure = err; return 7; }),
      clearWatch: vi.fn(),
    };
    vi.stubGlobal("navigator", { geolocation });
    const onFix = vi.fn();
    const onError = vi.fn();

    const watch = watchPositions(onFix, onError, TEXTS);
    success({ coords: { latitude: 47.1, longitude: 11.3, altitude: 2000, accuracy: 8, speed: 12 }, timestamp: 5 } as GeolocationPosition);
    expect(onFix).toHaveBeenCalledWith({ lat: 47.1, lng: 11.3, alt: 2000, accuracy: 8, speed: 12, t: 5 });
    failure({ code: 1 } as GeolocationPositionError);
    failure({ code: 3 } as GeolocationPositionError);
    expect(onError.mock.calls).toEqual([["denied"], ["unavailable"]]);

    watch.stop();
    expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
    expect(mocks.addWatcher).not.toHaveBeenCalled();
  });
});

describe("native positions", () => {
  it("uses the background watcher with the notification texts", async () => {
    mocks.native = true;
    let callback: (location?: unknown, error?: { code?: string }) => void = () => undefined;
    mocks.addWatcher.mockImplementation(async (_options: unknown, cb: typeof callback) => { callback = cb; return "w1"; });
    const onFix = vi.fn();
    const onError = vi.fn();

    expect(hasPositionSource()).toBe(true);
    const watch = watchPositions(onFix, onError, TEXTS);
    expect(mocks.addWatcher).toHaveBeenCalledWith(expect.objectContaining({ backgroundTitle: "Recording", backgroundMessage: "Tap to open", stale: false }), expect.any(Function));
    await Promise.resolve();

    callback({ latitude: 47, longitude: 11, altitude: null, accuracy: 5, speed: null, time: 9 });
    expect(onFix).toHaveBeenCalledWith({ lat: 47, lng: 11, alt: null, accuracy: 5, speed: null, t: 9 });
    callback(undefined, { code: "NOT_AUTHORIZED" });
    expect(onError).toHaveBeenCalledWith("denied");

    watch.stop();
    expect(mocks.removeWatcher).toHaveBeenCalledWith({ id: "w1" });
    callback({ latitude: 1, longitude: 1, altitude: null, accuracy: 5, speed: null, time: 10 });
    expect(onFix).toHaveBeenCalledTimes(1);
  });

  it("removes a watcher that only became ready after stop", async () => {
    mocks.native = true;
    let ready: (id: string) => void = () => undefined;
    mocks.addWatcher.mockReturnValue(new Promise<string>((resolve) => { ready = resolve; }));

    const watch = watchPositions(vi.fn(), vi.fn(), TEXTS);
    watch.stop();
    expect(mocks.removeWatcher).not.toHaveBeenCalled();
    ready("late");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.removeWatcher).toHaveBeenCalledWith({ id: "late" });
  });

  it("falls back to now when the device gives no time", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    expect(fixFromNative({ latitude: 1, longitude: 2, accuracy: 3, altitude: null, altitudeAccuracy: null, simulated: false, bearing: null, speed: null, time: null }).t).toBe(1234);
  });
});
