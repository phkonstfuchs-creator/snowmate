import { beforeEach, describe, expect, it, vi } from "vitest";

import { setAnalyticsConsentAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

const rpc = vi.fn();

describe("analytics consent action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("binds an opt-in to a server-generated pseudonymous id", async () => {
    rpc.mockResolvedValue({
      data: "9fc1a0dc-b151-4df2-86cb-f3015badf019",
      error: null,
    });

    await expect(
      setAnalyticsConsentAction({
        enabled: true,
        idempotencyKey: "10000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({
      ok: true,
      analyticsId: "9fc1a0dc-b151-4df2-86cb-f3015badf019",
    });

    expect(rpc).toHaveBeenCalledWith("set_analytics_consent", {
      p_enabled: true,
      p_idempotency_key: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("allows withdrawal without exposing or accepting an identity", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      setAnalyticsConsentAction({
        enabled: false,
        idempotencyKey: "10000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toEqual({ ok: true, analyticsId: null });
  });

  it("rejects malformed input and malformed database responses", async () => {
    await expect(
      setAnalyticsConsentAction({ enabled: "yes", idempotencyKey: "forged" }),
    ).resolves.toEqual({ ok: false, message: "Bitte prüfe deine Angaben." });
    expect(rpc).not.toHaveBeenCalled();

    rpc.mockResolvedValue({ data: "not-a-uuid", error: null });
    await expect(
      setAnalyticsConsentAction({
        enabled: true,
        idempotencyKey: "10000000-0000-4000-8000-000000000003",
      }),
    ).resolves.toEqual({
      ok: false,
      message: "Die Datenschutzauswahl konnte nicht gespeichert werden.",
    });
  });
});
