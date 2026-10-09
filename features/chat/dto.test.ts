import { describe, expect, it } from "vitest";
import {
  parseConversationRows,
  parseMessageRows,
  parseOwnReportRows,
} from "./dto";

const conversationRow = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "dm",
  ride_id: null,
  title: "Alex Berg",
  counterpart_user_id: "10000000-0000-4000-8000-000000000002",
  counterpart_handle: "alex_berg",
  counterpart_avatar_path: null,
  last_message_preview: "Bis morgen",
  last_message_at: "2026-08-03T10:00:00+00:00",
  created_at: "2026-08-03T09:00:00+00:00",
};

describe("chat DTO parsing", () => {
  it("maps conversation summaries without leaking private relationship data", () => {
    expect(parseConversationRows([conversationRow])).toEqual([
      expect.objectContaining({
        id: conversationRow.id,
        counterpart: expect.objectContaining({ handle: "alex_berg" }),
        lastMessagePreview: "Bis morgen",
      }),
    ]);

    expect(
      parseConversationRows([{ ...conversationRow, counterpart_email: "x@y.de" }]),
    ).toBeNull();
  });

  it("maps plain-text messages and rejects extra database fields", () => {
    const row = {
      id: "20000000-0000-4000-8000-000000000001",
      sender_id: "10000000-0000-4000-8000-000000000002",
      sender_display_name: "Alex Berg",
      sender_avatar_path: null,
      body: "Treffen wir uns am Lift?",
      created_at: "2026-08-03T10:05:00+00:00",
    };

    expect(parseMessageRows([row])?.[0]).toEqual(
      expect.objectContaining({ body: row.body, senderId: row.sender_id }),
    );
    expect(parseMessageRows([{ ...row, sender_email: "x@y.de" }])).toBeNull();
  });

  it("never accepts reporter identity in the own-report DTO", () => {
    const row = {
      id: "30000000-0000-4000-8000-000000000001",
      target_user_id: "10000000-0000-4000-8000-000000000002",
      reason_code: "harassment",
      message_id: null,
      ride_id: null,
      details: "Wiederholte Beleidigungen",
      status: "open",
      priority: "normal",
      severity: "high",
      created_at: "2026-08-03T10:05:00+00:00",
      target_response_at: "2026-08-04T10:05:00+00:00",
      resolved_at: null,
      appeal_status: null,
    };

    expect(parseOwnReportRows([row])?.[0]).toEqual(
      expect.objectContaining({ reasonCode: "harassment", status: "open" }),
    );
    expect(parseOwnReportRows([{ ...row, reporter_id: row.target_user_id }])).toBeNull();
  });
});
