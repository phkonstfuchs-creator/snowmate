import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: "ios",
  listeners: new Map<string, (event: unknown) => void>(),
  register: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => mocks.platform, isPluginAvailable: () => true },
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    register: mocks.register,
    addListener: vi.fn(async (event: string, cb: (event: unknown) => void) => {
      mocks.listeners.set(event, cb);
      return { remove: mocks.remove };
    }),
  },
}));

import { hasNativePush, onNativePushTap, registerNativePush, rememberNativeToken, safePushPath, storedNativeToken } from "./native-push";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.platform = "ios";
  mocks.listeners.clear();
  mocks.register.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  window.localStorage.clear();
});

describe("native push", () => {
  it("exists only on iOS", () => {
    expect(hasNativePush()).toBe(true);
    mocks.platform = "web";
    expect(hasNativePush()).toBe(false);
  });

  it("resolves the token iOS hands over, or null on error", async () => {
    const pending = registerNativePush();
    await vi.waitFor(() => expect(mocks.listeners.has("registration")).toBe(true));
    mocks.listeners.get("registration")!({ value: "ab".repeat(32) });
    await expect(pending).resolves.toBe("ab".repeat(32));

    const failing = registerNativePush();
    await vi.waitFor(() => expect(mocks.listeners.has("registrationError")).toBe(true));
    mocks.listeners.get("registrationError")!({ error: "no entitlement" });
    await expect(failing).resolves.toBeNull();
  });

  it("gives up after the timeout", async () => {
    vi.useFakeTimers();
    const pending = registerNativePush(1000);
    vi.advanceTimersByTime(1000);
    await expect(pending).resolves.toBeNull();
    vi.useRealTimers();
  });

  it("opens only paths inside the app when a notice is tapped", async () => {
    const open = vi.fn();
    const stop = onNativePushTap(open);
    await vi.waitFor(() => expect(mocks.listeners.has("pushNotificationActionPerformed")).toBe(true));
    const tap = mocks.listeners.get("pushNotificationActionPerformed")!;
    tap({ notification: { data: { url: "/crew/chat/abc" } } });
    tap({ notification: { data: { url: "https://evil.example" } } });
    tap({ notification: { data: { url: "//evil.example" } } });
    expect(open.mock.calls).toEqual([["/crew/chat/abc"], ["/feed"], ["/feed"]]);
    stop();
    expect(safePushPath(undefined)).toBe("/feed");
  });

  it("remembers the token on this device only until switched off", () => {
    rememberNativeToken("ab");
    expect(storedNativeToken()).toBe("ab");
    rememberNativeToken(null);
    expect(storedNativeToken()).toBeNull();
  });
});
