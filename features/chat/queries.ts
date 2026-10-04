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
