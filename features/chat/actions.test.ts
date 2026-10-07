import { beforeEach, describe, expect, it, vi } from "vitest";
import { openDirectChatAction, openRideChatAction, pollMessagesAction, sendLocationAction, sendMessageAction } from "./actions";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const CONV = "c4a70000-0000-4000-8000-0000000000aa";
const USER = "c4a70000-0000-4000-8000-000000000002";

describe("chat actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens a direct chat and goes there", async () => {
    mocks.rpc.mockResolvedValue({ data: CONV, error: null });
    await expect(openDirectChatAction(USER)).rejects.toThrow(`redirect:/crew/chat/${CONV}?with=${USER}`);
    expect(mocks.rpc).toHaveBeenCalledWith("open_direct_chat", { other: USER });
  });

  it("reports a refused chat without navigating", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(openDirectChatAction(USER)).resolves.toBe(false);
    await expect(openRideChatAction(USER)).resolves.toBe(false);
    mocks.rpc.mockRejectedValue(new Error("offline"));
    await expect(openRideChatAction(USER)).resolves.toBe(false);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("refuses ids that are not ids before asking the database", async () => {
    await expect(openDirectChatAction("../../admin")).resolves.toBe(false);
    await expect(openRideChatAction("x")).resolves.toBe(false);
    await expect(sendMessageAction("x", "hi")).resolves.toBe("forbidden");
    await expect(pollMessagesAction("x", null)).resolves.toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("opens a ride chat", async () => {
    mocks.rpc.mockResolvedValue({ data: CONV, error: null });
    await expect(openRideChatAction(USER)).rejects.toThrow(`redirect:/crew/chat/${CONV}`);
    expect(mocks.rpc).toHaveBeenCalledWith("open_ride_chat", { target_ride: USER });
  });

  it("sends a position as a pin; identity comes from the session", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "sent", error: null });
    await expect(sendLocationAction(CONV, 47.2, 11.3)).resolves.toBe("sent");
    expect(mocks.rpc).toHaveBeenCalledWith("send_location_message", { conv: CONV, p_lat: 47.2, p_lng: 11.3 });
    mocks.rpc.mockResolvedValueOnce({ data: "too_young", error: null });
    await expect(sendLocationAction(CONV, 47.2, 11.3)).resolves.toBe("too_young");
    mocks.rpc.mockClear();
    await expect(sendLocationAction(CONV, 200, 11.3)).resolves.toBe("invalid");
    await expect(sendLocationAction("x", 47, 11)).resolves.toBe("forbidden");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("sends the trimmed text and passes the database's answer on", async () => {
    mocks.rpc.mockResolvedValue({ data: "sent", error: null });
    await expect(sendMessageAction(CONV, "  hi  ")).resolves.toBe("sent");
    expect(mocks.rpc).toHaveBeenCalledWith("send_message", { conv: CONV, message: "hi" });

    mocks.rpc.mockResolvedValue({ data: "rate_limited", error: null });
    await expect(sendMessageAction(CONV, "hi")).resolves.toBe("rate_limited");
    mocks.rpc.mockResolvedValue({ data: "surprise", error: null });
    await expect(sendMessageAction(CONV, "hi")).resolves.toBe("unavailable");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "x" } });
    await expect(sendMessageAction(CONV, "hi")).resolves.toBe("unavailable");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PB001" } });
    await expect(sendMessageAction(CONV, "hi")).resolves.toBe("blocked");
    mocks.rpc.mockRejectedValue(new Error("offline"));
    await expect(sendMessageAction(CONV, "hi")).resolves.toBe("unavailable");
  });

  it("refuses an empty message without a round trip", async () => {
    await expect(sendMessageAction(CONV, "   ")).resolves.toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("polls new messages and marks the chat read", async () => {
    mocks.rpc.mockImplementation(async (fn: string) =>
      fn === "list_messages"
        ? { data: [{ id: "m1", sender_id: USER, sender_name: "Lena", sender_handle: "lena", body: "hi", created_at: "2026-10-05T10:00:00Z", is_mine: false }], error: null }
        : { data: null, error: null },
    );

    await expect(pollMessagesAction(CONV, "2026-10-05T09:00:00Z")).resolves.toEqual([
      expect.objectContaining({ id: "m1", senderName: "Lena" }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_messages", { conv: CONV, since: "2026-10-05T09:00:00Z" });
    expect(mocks.rpc).toHaveBeenCalledWith("mark_conversation_read", { conv: CONV });
  });

  it("ignores a broken since value and survives failures", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(pollMessagesAction(CONV, "not a date")).resolves.toEqual([]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_messages", { conv: CONV, since: null });

    mocks.rpc.mockResolvedValue({ data: null, error: { code: "x" } });
    await expect(pollMessagesAction(CONV, null)).resolves.toBeNull();
    mocks.rpc.mockRejectedValue(new Error("offline"));
    await expect(pollMessagesAction(CONV, null)).resolves.toBeNull();
  });
});
