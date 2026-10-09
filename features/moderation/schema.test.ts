import { describe, expect, it } from "vitest";

import {
  moderateReportSchema,
  resolveReportAppealSchema,
} from "./schema";

const reportId = "10000000-0000-4000-8000-000000000001";
const idempotencyKey = "20000000-0000-4000-8000-000000000001";

describe("moderation command schemas", () => {
  it("accepts only appealable enforcement status combinations", () => {
    expect(
      moderateReportSchema.safeParse({
        reportId,
        newStatus: "actioned",
        action: "account_suspended",
        reason: "Temporary suspension after reviewing the evidence",
        idempotencyKey,
      }).success,
    ).toBe(true);
    expect(
      moderateReportSchema.safeParse({
        reportId,
        newStatus: "triaged",
        action: "account_suspended",
        reason: "This would make enforcement impossible to appeal",
        idempotencyKey,
      }).success,
    ).toBe(false);
  });

  it("normalizes reasons and rejects control characters", () => {
    const parsed = moderateReportSchema.parse({
      reportId,
      newStatus: "dismissed",
      action: "no_action",
      reason: "  No policy breach was found  ",
      idempotencyKey,
    });

    expect(parsed.reason).toBe("No policy breach was found");
    expect(
      resolveReportAppealSchema.safeParse({
        appealId: reportId,
        outcome: "upheld",
        reason: "unsafe\u0000reason",
        idempotencyKey,
      }).success,
    ).toBe(false);
  });
});
