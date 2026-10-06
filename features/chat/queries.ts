import { createClient } from "@/lib/supabase/server";
import {
  isUuid,
  toChatMessage,
  toChatSummary,
  type ChatMessage,
  type ChatSummary,
  type ConversationRow,
  type MessageRow,
} from "./message";

/* The caller's chats; null when the backend could not be reached. */
export async function listMyChats(): Promise<ChatSummary[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_my_conversations");
    if (error || !Array.isArray(data)) return null;
    return (data as ConversationRow[]).map(toChatSummary);
  } catch {
    return null;
  }
}

/* Latest messages of one chat. Empty when the caller may not use it;
   null on a failure. */
export async function listChatMessages(conversationId: string): Promise<ChatMessage[] | null> {
  if (!isUuid(conversationId)) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_messages", { conv: conversationId });
    if (error || !Array.isArray(data)) return null;
    return (data as MessageRow[]).map(toChatMessage);
  } catch {
    return null;
  }
}

/* A direct chat that has no messages yet, so it is not in the chat list.
   The database confirms it: open_direct_chat returns this very chat only
   for two friends who have not blocked each other. null otherwise. */
export async function getNewDirectChat(conversationId: string, otherUserId: string): Promise<ChatSummary | null> {
  if (!isUuid(conversationId) || !isUuid(otherUserId)) return null;
  try {
    const supabase = await createClient();
    const { data: id, error } = await supabase.rpc("open_direct_chat", { other: otherUserId });
    if (error || id !== conversationId) return null;
    const { data: rows } = await supabase.rpc("list_my_friendships");
    const friend = Array.isArray(rows)
      ? (rows as { user_id: string; display_name: string | null; handle: string | null }[]).find((row) => row.user_id === otherUserId)
      : undefined;
    return {
      id: conversationId,
      kind: "direct",
      otherUserId,
      otherName: friend?.display_name ?? null,
      otherHandle: friend?.handle ?? null,
      rideId: null,
      rideResort: null,
      rideDate: null,
      lastBody: null,
      lastAt: null,
      lastIsMine: false,
      unread: 0,
    };
  } catch {
    return null;
  }
}

/* For the Crew tab badge; zero on any failure. */
export async function getUnreadChatCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_unread_chats");
    return error ? 0 : Math.max(0, Number(data) || 0);
  } catch {
    return 0;
  }
}
