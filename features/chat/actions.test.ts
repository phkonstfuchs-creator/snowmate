import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAppealAction,
  createDmAction,
  createReportAction,
  sendMessageAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const rpc = vi.fn();
const id = "10000000-0000-4000-8000-000000000001";
const targetId = "20000000-0000-4000-8000-000000000001";
const idempotencyKey = "30000000-0000-4000-8000-000000000001";

describe("chat commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
    rpc.mockResolvedValue({ data: id, error: null });
  });

  it("creates a DM without accepting a caller-controlled user id", async () => {
    await expect(
      createDmAction({ targetUserId: targetId, idempotencyKey }),
    ).resolves.toEqual({ ok: true, id });
    expect(rpc).toHaveBeenCalledWith("create_dm", {
      p_idempotency_key: idempotencyKey,
      p_target_user_id: targetId,
    });
  });

  it("normalizes and sends plain text through the command RPC", async () => {
    await sendMessageAction({
      conversationId: id,
      text: "  Bis morgen am Lift  ",
      idempotencyKey,
    });

    expect(rpc).toHaveBeenCalledWith("send_message", {
      p_body: "Bis morgen am Lift",
      p_conversation_id: id,
      p_idempotency_key: idempotencyKey,
    });
  });

  it("maps optional report context to explicit null values", async () => {
    await createReportAction({
      targetUserId: targetId,
      reasonCode: "harassment",
      details: "  Wiederholte Beleidigungen  ",
      idempotencyKey,
    });

    expect(rpc).toHaveBeenCalledWith("create_report", {
      p_details: "Wiederholte Beleidigungen",
      p_idempotency_key: idempotencyKey,
      p_message_id: null,
      p_reason_code: "harassment",
      p_ride_id: null,
      p_target_user_id: targetId,
    });
  });

  it("rejects invalid input before opening a database client", async () => {
    const result = await createDmAction({ targetUserId: "invalid" });

    expect(result.ok).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("submits a validated appeal through the idempotent RPC", async () => {
    await createAppealAction({
      reportId: id,
      text: "Bitte prüft diese Entscheidung erneut.",
      idempotencyKey,
    });

    expect(rpc).toHaveBeenCalledWith("create_appeal", {
      p_body: "Bitte prüft diese Entscheidung erneut.",
      p_idempotency_key: idempotencyKey,
      p_report_id: id,
    });
  });
});
