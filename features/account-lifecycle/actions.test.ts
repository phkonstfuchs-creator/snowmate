import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requestAccountDeletionAction,
  requestExportAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  executeUuidCommand: vi.fn(),
  invalidCommandInput: vi.fn(() => ({ ok: false, message: "invalid" })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/commands", () => ({
  executeUuidCommand: mocks.executeUuidCommand,
  invalidCommandInput: mocks.invalidCommandInput,
}));

const signOut = vi.fn();

describe("account lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth: { signOut } });
  });

  it("requests an export through the validated RPC contract", async () => {
    mocks.executeUuidCommand.mockResolvedValue({
      ok: true,
      id: "30000000-0000-4000-8000-000000000001",
    });

    await requestExportAction({
      idempotencyKey: "10000000-0000-4000-8000-000000000001",
    });

    expect(mocks.executeUuidCommand).toHaveBeenCalledWith(
      "request_export",
      { p_idempotency_key: "10000000-0000-4000-8000-000000000001" },
      "/settings/privacy",
    );
  });

  it("rejects invalid deletion input before opening an auth client", async () => {
    await expect(
      requestAccountDeletionAction({
        confirmation: "delete",
        idempotencyKey: "10000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toEqual({ ok: false, message: "invalid" });

    expect(mocks.executeUuidCommand).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("queues deletion and revokes all refresh sessions after success", async () => {
    const result = {
      ok: true as const,
      id: "30000000-0000-4000-8000-000000000002",
    };
    mocks.executeUuidCommand.mockResolvedValue(result);
    signOut.mockResolvedValue({ error: null });

    await expect(
      requestAccountDeletionAction({
        confirmation: "DELETE",
        idempotencyKey: "10000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toEqual(result);

    expect(mocks.executeUuidCommand).toHaveBeenCalledWith(
      "request_account_deletion",
      {
        p_confirmation: "DELETE",
        p_idempotency_key: "10000000-0000-4000-8000-000000000002",
      },
      "/settings/privacy",
    );
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("does not sign out when the deletion command fails", async () => {
    const result = { ok: false as const, message: "failed" };
    mocks.executeUuidCommand.mockResolvedValue(result);

    await expect(
      requestAccountDeletionAction({
        confirmation: "DELETE",
        idempotencyKey: "10000000-0000-4000-8000-000000000003",
      }),
    ).resolves.toEqual(result);

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
