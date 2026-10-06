import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNewDirectChat, getUnreadChatCount, listChatMessages, listMyChats } from "./queries";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

const CONV = "c4a70000-0000-4000-8000-0000000000aa";

describe("chat queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists chats and messages", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ conversation_id: CONV, kind: "direct", other_user_id: "u", other_name: "Lena", other_handle: "lena", ride_id: null, ride_resort: null, ride_date: null, last_body: "hi", last_at: "t", last_is_mine: false, unread: 1 }],
      error: null,
    });
    await expect(listMyChats()).resolves.toEqual([expect.objectContaining({ id: CONV, unread: 1 })]);

    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(listChatMessages(CONV)).resolves.toEqual([]);
    expect(rpc).toHaveBeenLastCalledWith("list_messages", { conv: CONV });
  });

  it("returns null on failures and nothing for a bad id", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "x" } });
    await expect(listMyChats()).resolves.toBeNull();
    await expect(listChatMessages(CONV)).resolves.toBeNull();
    await expect(getUnreadChatCount()).resolves.toBe(0);
    rpc.mockRejectedValue(new Error("offline"));
    await expect(listMyChats()).resolves.toBeNull();
    await expect(listChatMessages(CONV)).resolves.toBeNull();
    await expect(getUnreadChatCount()).resolves.toBe(0);
    await expect(listChatMessages("nope")).resolves.toEqual([]);
  });

  it("counts unread chats", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    await expect(getUnreadChatCount()).resolves.toBe(3);
  });

  it("confirms a brand-new direct chat only through open_direct_chat", async () => {
    const FRIEND = "c4a70000-0000-4000-8000-000000000002";
    rpc.mockImplementation(async (fn: string) =>
      fn === "open_direct_chat"
        ? { data: CONV, error: null }
        : { data: [{ user_id: FRIEND, display_name: "Lena", handle: "lena_m", status: "accepted" }], error: null },
    );
    await expect(getNewDirectChat(CONV, FRIEND)).resolves.toMatchObject({ id: CONV, kind: "direct", otherUserId: FRIEND, otherName: "Lena" });
    expect(rpc).toHaveBeenCalledWith("open_direct_chat", { other: FRIEND });

    /* Another chat id (or none: not friends, blocked) is refused. */
    rpc.mockImplementation(async () => ({ data: null, error: null }));
    await expect(getNewDirectChat(CONV, FRIEND)).resolves.toBeNull();
    await expect(getNewDirectChat(CONV, "nope")).resolves.toBeNull();
  });
});
