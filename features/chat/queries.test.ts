import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUnreadChatCount, listChatMessages, listMyChats } from "./queries";

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
});
