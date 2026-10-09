import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConversations, getMessages, getOwnReports } from "./data";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const rpc = vi.fn();
const conversationRow = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "ride",
  ride_id: "20000000-0000-4000-8000-000000000001",
  title: "Stubaier Gletscher",
  counterpart_user_id: null,
  counterpart_handle: null,
  counterpart_avatar_path: null,
  last_message_preview: null,
  last_message_at: null,
  created_at: "2026-08-03T10:00:00+00:00",
};

describe("chat data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("reads conversation DTOs through the authenticated RPC", async () => {
    rpc.mockResolvedValue({ data: [conversationRow], error: null });

    await expect(getConversations()).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ id: conversationRow.id })],
    });
    expect(rpc).toHaveBeenCalledWith("get_conversations");
  });

  it("fails closed when a conversation response contains extra fields", async () => {
    rpc.mockResolvedValue({
      data: [{ ...conversationRow, participant_email: "x@y.de" }],
      error: null,
    });

    await expect(getConversations()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("validates message query identifiers before opening a client", async () => {
    await expect(getMessages("not-a-uuid")).resolves.toEqual({
      status: "unavailable",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("loads a validated message page with an optional cursor", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          sender_id: "40000000-0000-4000-8000-000000000001",
          sender_display_name: "Alex Berg",
          sender_avatar_path: null,
          body: "Bis morgen",
          created_at: "2026-08-03T10:00:00+00:00",
        },
      ],
      error: null,
    });

    await expect(
      getMessages(conversationRow.id, {
        createdAt: "2026-08-03T11:00:00.000Z",
        id: "30000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ body: "Bis morgen" })],
    });
    expect(rpc).toHaveBeenCalledWith("get_messages", {
      p_before: "2026-08-03T11:00:00.000Z",
      p_before_id: "30000000-0000-4000-8000-000000000002",
      p_conversation_id: conversationRow.id,
      p_limit: 50,
    });
  });

  it("rejects partial message cursors before opening a client", async () => {
    await expect(
      getMessages(conversationRow.id, {
        createdAt: "2026-08-03T11:00:00.000Z",
        id: "not-a-uuid",
      }),
    ).resolves.toEqual({ status: "unavailable" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("loads own reports and hides database failures", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: "50000000-0000-4000-8000-000000000001",
          target_user_id: null,
          reason_code: "harassment",
          message_id: null,
          ride_id: null,
          details: "",
          status: "closed",
          priority: "normal",
          severity: "high",
          created_at: "2026-08-03T10:00:00+00:00",
          target_response_at: "2026-08-04T10:00:00+00:00",
          resolved_at: "2026-08-03T12:00:00+00:00",
          appeal_status: null,
        },
      ],
      error: null,
    });
    await expect(getOwnReports()).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ status: "closed" })],
    });

    rpc.mockRejectedValueOnce(new Error("private database detail"));
    await expect(getOwnReports()).resolves.toEqual({ status: "unavailable" });
  });
});
