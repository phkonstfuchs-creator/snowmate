import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalUserAgent = navigator.userAgent;

const mocks = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn(), owns: vi.fn() }));
vi.mock("./actions", () => ({ savePushSubscriptionAction: mocks.save, deletePushSubscriptionAction: mocks.remove, isMyPushSubscriptionAction: mocks.owns }));

const subscription = {
  endpoint: "https://web.push.apple.com/QGx",
  toJSON: () => ({ endpoint: "https://web.push.apple.com/QGx", keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

function browser(permission: NotificationPermission, existing: unknown = null) {
  const pushManager = { getSubscription: vi.fn().mockResolvedValue(existing), subscribe: vi.fn().mockResolvedValue(subscription) };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: vi.fn().mockResolvedValue({ pushManager }) } });
  vi.stubGlobal("PushManager", function PushManager() {});
  vi.stubGlobal("Notification", { permission, requestPermission: vi.fn().mockResolvedValue("granted") });
  return pushManager;
}

async function load() {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AQID");
  vi.resetModules();
  return (await import("./PushSettings")).default;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue("saved");
  mocks.remove.mockResolvedValue(true);
  mocks.owns.mockResolvedValue(true);
});
afterEach(() => {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: originalUserAgent });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("PushSettings", () => {
  it("shows ordered Home Screen steps on iOS browsers without push", async () => {
    vi.stubGlobal("PushManager", undefined);
    Object.defineProperty(window, "PushManager", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "iPhone" });
    delete (window as unknown as { PushManager?: unknown }).PushManager;
    const PushSettings = await load();
    render(<PushSettings />);
    expect(await screen.findByRole("list")).toHaveProperty("tagName", "OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("Add to Home Screen");
  });

  it("is off until switched on, then subscribes and stores the device", async () => {
    const pushManager = browser("default");
    const PushSettings = await load();
    render(<PushSettings />);
    const toggle = await screen.findByRole("switch", { name: "Push notifications on this device" });
    await vi.waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(mocks.save).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
    await vi.waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(mocks.save).toHaveBeenCalledWith(subscription.toJSON());
  });

  it("switches off by removing the device", async () => {
    browser("granted", subscription);
    const PushSettings = await load();
    render(<PushSettings />);
    const toggle = await screen.findByRole("switch");
    await vi.waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(mocks.owns).toHaveBeenCalledWith(subscription.endpoint);
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await vi.waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalled());
    expect(mocks.remove).toHaveBeenCalledWith(subscription.endpoint);
    await vi.waitFor(() => expect(screen.getByRole("switch")).not.toBeDisabled());
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("does not claim or keep another account's subscription on a shared browser", async () => {
    browser("granted", subscription);
    mocks.owns.mockResolvedValue(false);
    const PushSettings = await load();
    render(<PushSettings />);
    const toggle = await screen.findByRole("switch");
    await vi.waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.owns).toHaveBeenCalledWith(subscription.endpoint);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("removes an unverified existing subscription after a server failure", async () => {
    browser("granted", subscription);
    mocks.owns.mockRejectedValue(new Error("network"));
    const PushSettings = await load();
    render(<PushSettings />);
    const toggle = await screen.findByRole("switch");
    await vi.waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it("explains a blocked permission instead of offering the switch", async () => {
    browser("denied");
    const PushSettings = await load();
    render(<PushSettings />);
    expect(await screen.findByText(/blocked for Pistl/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
