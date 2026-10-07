import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removePushOnSignOut } from "./remove-on-sign-out";

const mocks = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock("./actions", () => ({ deletePushSubscriptionAction: mocks.remove }));

const endpoint = "https://web.push.apple.com/device";

function browser(subscription: { endpoint: string; unsubscribe: () => Promise<boolean> } | null) {
  const getSubscription = vi.fn().mockResolvedValue(subscription);
  const getRegistration = vi.fn().mockResolvedValue({ pushManager: { getSubscription } });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration, register: vi.fn() },
  });
  return { getRegistration, getSubscription };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.remove.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllGlobals());

describe("push cleanup on sign-out", () => {
  it("removes this browser's endpoint from the account before unsubscribing", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const { getRegistration } = browser({ endpoint, unsubscribe });
    await removePushOnSignOut();
    expect(getRegistration).toHaveBeenCalledWith("/");
    expect(mocks.remove).toHaveBeenCalledWith(endpoint);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(unsubscribe.mock.invocationCallOrder[0]!);
  });

  it("unsubscribes locally even when server removal fails, so an old account stops reaching this device", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    browser({ endpoint, unsubscribe });
    mocks.remove.mockRejectedValue(new Error("network"));
    await expect(removePushOnSignOut()).resolves.toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not create a new worker or subscription when none exists", async () => {
    const { getRegistration } = browser(null);
    await removePushOnSignOut();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    expect(getRegistration).toHaveBeenCalledOnce();
  });
});
