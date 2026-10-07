import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteNativePushTokenAction,
  deletePushSubscriptionAction,
  isMyNativePushTokenAction,
  isMyPushSubscriptionAction,
  saveNativePushTokenAction,
  savePushSubscriptionAction,
} from "./actions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));

const subscription = { endpoint: "https://web.push.apple.com/QGx", keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } };

beforeEach(() => vi.clearAllMocks());

describe("push subscription actions", () => {
  it("stores a valid subscription for the session's account", async () => {
    mocks.rpc.mockResolvedValue({ data: "saved", error: null });
    await expect(savePushSubscriptionAction(subscription)).resolves.toBe("saved");
    expect(mocks.rpc).toHaveBeenCalledWith("save_push_subscription", {
      p_endpoint: subscription.endpoint,
      p_p256dh: subscription.keys.p256dh,
      p_auth: subscription.keys.auth,
    });
  });

  it("never sends an invalid one and reports backend failures", async () => {
    await expect(savePushSubscriptionAction({ endpoint: "https://evil.example.com/x", keys: subscription.keys })).resolves.toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    await expect(savePushSubscriptionAction(subscription)).resolves.toBe("unavailable");
  });

  it("removes this device", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(deletePushSubscriptionAction(subscription.endpoint)).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_push_subscription", { p_endpoint: subscription.endpoint });
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(deletePushSubscriptionAction(subscription.endpoint)).resolves.toBe(false);
  });

  it("checks that an existing browser endpoint belongs to this session before showing push as on", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(isMyPushSubscriptionAction(subscription.endpoint)).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("is_my_push_subscription", { p_endpoint: subscription.endpoint });

    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(isMyPushSubscriptionAction(subscription.endpoint)).resolves.toBe(false);
    await expect(isMyPushSubscriptionAction("https://evil.example/x")).resolves.toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});

describe("native push token actions", () => {
  const TOKEN = "AB".repeat(32);

  it("stores a lower-cased APNs token for this session", async () => {
    mocks.rpc.mockResolvedValue({ data: "saved", error: null });
    await expect(saveNativePushTokenAction(TOKEN)).resolves.toBe("saved");
    expect(mocks.rpc).toHaveBeenCalledWith("save_native_push_token", { p_token: "ab".repeat(32), p_platform: "ios" });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "x" } });
    await expect(saveNativePushTokenAction(TOKEN)).resolves.toBe("unavailable");
    mocks.rpc.mockResolvedValue({ data: "surprise", error: null });
    await expect(saveNativePushTokenAction(TOKEN)).resolves.toBe("unavailable");
  });

  it("never sends something that is not a token", async () => {
    await expect(saveNativePushTokenAction("../x")).resolves.toBe("invalid");
    await expect(saveNativePushTokenAction(42)).resolves.toBe("invalid");
    await expect(deleteNativePushTokenAction("x")).resolves.toBe(false);
    await expect(isMyNativePushTokenAction(null)).resolves.toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("removes and checks this device", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(deleteNativePushTokenAction(TOKEN)).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_native_push_token", { p_token: "ab".repeat(32) });
    await expect(isMyNativePushTokenAction(TOKEN)).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenLastCalledWith("is_my_native_push_token", { p_token: "ab".repeat(32) });
    mocks.rpc.mockRejectedValue(new Error("offline"));
    await expect(deleteNativePushTokenAction(TOKEN)).resolves.toBe(false);
    await expect(isMyNativePushTokenAction(TOKEN)).resolves.toBe(false);
  });
});
