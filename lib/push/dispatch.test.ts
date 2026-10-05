import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchPushSoon } from "./dispatch";

const mocks = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock("next/server", () => ({ after: mocks.after }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "BPub");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("dispatchPushSoon", () => {
  it("calls the edge function after the response, with the public key only", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    dispatchPushSoon();
    expect(fetch).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0]![0]();
    expect(fetch).toHaveBeenCalledWith("https://abc.supabase.co/functions/v1/push-dispatch", expect.objectContaining({ method: "POST", headers: { apikey: "sb_publishable_x" } }));
  });

  it("does nothing until push is configured, and never throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    dispatchPushSoon();
    expect(mocks.after).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "BPub");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    dispatchPushSoon();
    await expect(mocks.after.mock.calls[0]![0]()).resolves.toBeUndefined();
  });
});
