import { describe, expect, it } from "vitest";
import {
  parseAccountDeletionStatusRows,
  parseExportRequestRows,
} from "./dto";

describe("account lifecycle DTOs", () => {
  it("maps export status rows without database field leakage", () => {
    expect(
      parseExportRequestRows([
        {
          id: "10000000-0000-4000-8000-000000000001",
          status: "ready",
          requested_at: "2026-08-03T10:00:00+00:00",
          expires_at: "2026-08-04T10:00:00+00:00",
          downloaded_at: null,
        },
      ]),
    ).toEqual([
      {
        id: "10000000-0000-4000-8000-000000000001",
        status: "ready",
        requestedAt: "2026-08-03T10:00:00+00:00",
        expiresAt: "2026-08-04T10:00:00+00:00",
        downloadedAt: null,
      },
    ]);
  });

  it("rejects extra export and deletion worker fields", () => {
    expect(
      parseExportRequestRows([
        {
          id: "10000000-0000-4000-8000-000000000001",
          status: "ready",
          requested_at: "2026-08-03T10:00:00+00:00",
          expires_at: "2026-08-04T10:00:00+00:00",
          downloaded_at: null,
          payload: { email: "must-not-leak@example.com" },
        },
      ]),
    ).toBeNull();

    expect(
      parseAccountDeletionStatusRows([
        {
          id: "20000000-0000-4000-8000-000000000001",
          status: "pending",
          storage_status: "skipped",
          database_status: "pending",
          brevo_status: "pending",
          posthog_status: "skipped",
          requested_at: "2026-08-03T10:00:00+00:00",
          escalation_at: "2026-08-04T10:00:00+00:00",
          hard_deadline_at: "2026-08-10T10:00:00+00:00",
          completed_at: null,
          email: "must-not-leak@example.com",
        },
      ]),
    ).toBeNull();
  });

  it("maps non-sensitive deletion progress", () => {
    expect(
      parseAccountDeletionStatusRows([
        {
          id: "20000000-0000-4000-8000-000000000001",
          status: "failed",
          storage_status: "completed",
          database_status: "pending",
          brevo_status: "failed",
          posthog_status: "skipped",
          requested_at: "2026-08-03T10:00:00+00:00",
          escalation_at: "2026-08-04T10:00:00+00:00",
          hard_deadline_at: "2026-08-10T10:00:00+00:00",
          completed_at: null,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        id: "20000000-0000-4000-8000-000000000001",
        status: "failed",
        databaseStatus: "pending",
      }),
    ]);
  });
});
