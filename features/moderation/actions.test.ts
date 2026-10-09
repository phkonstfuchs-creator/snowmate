import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  moderateReportAction,
  resolveReportAppealAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const rpc = vi.fn();
const decisionId = "10000000-0000-4000-8000-000000000001";
const reportId = "20000000-0000-4000-8000-000000000001";
const appealId = "30000000-0000-4000-8000-000000000001";
const idempotencyKey = "40000000-0000-4000-8000-000000000001";

describe("moderation commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
    rpc.mockResolvedValue({ data: decisionId, error: null });
  });

  it("submits a session-bound moderation decision", async () => {
    await expect(
      moderateReportAction({
        reportId,
        newStatus: "actioned",
        action: "content_removed",
        reason: "The reported message violates the community rules",
        idempotencyKey,
      }),
    ).resolves.toEqual({ ok: true, id: decisionId });

    expect(rpc).toHaveBeenCalledWith("moderate_report", {
      p_action: "content_removed",
      p_idempotency_key: idempotencyKey,
      p_new_status: "actioned",
      p_reason: "The reported message violates the community rules",
      p_report_id: reportId,
    });
  });

  it("rejects mismatched status and action before creating a client", async () => {
    const result = await moderateReportAction({
      reportId,
      newStatus: "triaged",
      action: "account_banned",
      reason: "Invalid non-appealable enforcement attempt",
      idempotencyKey,
    });

    expect(result.ok).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("resolves an appeal through the MFA-guarded database command", async () => {
    await resolveReportAppealAction({
      appealId,
      outcome: "upheld",
      reason: "The evidence does not support the original action",
      idempotencyKey,
    });

    expect(rpc).toHaveBeenCalledWith("resolve_report_appeal", {
      p_appeal_id: appealId,
      p_idempotency_key: idempotencyKey,
      p_outcome: "upheld",
      p_reason: "The evidence does not support the original action",
    });
  });
});
