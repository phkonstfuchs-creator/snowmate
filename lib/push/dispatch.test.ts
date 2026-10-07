import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchPushSoon } from "./dispatch";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({ after: vi.fn(), getSession: vi.fn() }));
const client = { auth: { getSession: mocks.getSession } } as unknown as SupabaseClient;
vi.mock("next/server", () => ({ after: mocks.after }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "user-jwt" } }, error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "BPub");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("dispatchPushSoon", () => {
  it("calls the edge function after the response with the user's session and a public key", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    await dispatchPushSoon(client);
    expect(fetch).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0]![0]();
    expect(fetch).toHaveBeenCalledWith("https://abc.supabase.co/functions/v1/push-dispatch", expect.objectContaining({ method: "POST", headers: { apikey: "sb_publishable_x", Authorization: "Bearer user-jwt" } }));
  });

  it("does nothing until push is configured, and never throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    await dispatchPushSoon(client);
    expect(mocks.after).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "BPub");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await dispatchPushSoon(client);
    await expect(mocks.after.mock.calls[0]![0]()).resolves.toBeUndefined();
  });

  it("does not schedule anonymous calls", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await dispatchPushSoon(client);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("never turns an already successful write into a failure if after registration fails", async () => {
    mocks.after.mockImplementationOnce(() => { throw new Error("not in a request"); });
    await expect(dispatchPushSoon(client)).resolves.toBeUndefined();
  });
});
