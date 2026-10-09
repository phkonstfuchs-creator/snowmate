import { describe, expect, it } from "vitest";

import {
  parseModerationAppealRows,
  parseModerationQueueRows,
} from "./dto";

const queueRow = {
  id: "10000000-0000-4000-8000-000000000001",
  reporter_id: "20000000-0000-4000-8000-000000000001",
  target_user_id: "30000000-0000-4000-8000-000000000001",
  reason_code: "harassment",
  message_id: null,
  ride_id: null,
  details: "Repeated harassment",
  reported_message_body: null,
  status: "open",
  priority: "normal",
  severity: "high",
  created_at: "2026-08-03T10:00:00.000Z",
  target_response_at: "2026-08-04T10:00:00.000Z",
  pending_appeals: 0,
};

describe("moderation DTO parsing", () => {
  it("maps the guarded queue RPC to an explicit frontend DTO", () => {
    expect(parseModerationQueueRows([queueRow])).toEqual([
      expect.objectContaining({
        id: queueRow.id,
        reporterId: queueRow.reporter_id,
        pendingAppeals: 0,
      }),
    ]);
  });

  it("rejects undeclared queue fields", () => {
    expect(
      parseModerationQueueRows([
        { ...queueRow, reporter_email: "private@example.com" },
      ]),
    ).toBeNull();
  });

  it("accepts purged appeal text without weakening the typed boundary", () => {
    expect(
      parseModerationAppealRows([
        {
          id: "40000000-0000-4000-8000-000000000001",
          report_id: queueRow.id,
          appellant_id: queueRow.target_user_id,
          body: null,
          status: "rejected",
          target_response_at: "2026-08-10T10:00:00.000Z",
          resolved_at: "2026-08-04T10:00:00.000Z",
          created_at: "2026-08-03T12:00:00.000Z",
        },
      ]),
    ).toEqual([expect.objectContaining({ body: null, status: "rejected" })]);
  });
});
