"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid, normalizeMessage, toChatMessage, type ChatMessage, type MessageRow, type SendOutcome } from "./message";

const SEND_OUTCOMES: readonly SendOutcome[] = ["sent", "forbidden", "invalid", "rate_limited", "profile_incomplete"];

async function openChat(fn: "open_direct_chat" | "open_ride_chat", args: Record<string, string>): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, args);
    return !error && isUuid(data) ? data : null;
  } catch {
    return null;
  }
}

/* Opens (or creates) the chat and goes there. Returns false when the
   database refused: not friends, blocked, not in the ride. */
export async function openDirectChatAction(otherUserId: string): Promise<false> {
  if (!isUuid(otherUserId)) return false;
  const id = await openChat("open_direct_chat", { other: otherUserId });
  if (!id) return false;
  redirect(`/crew/chat/${id}`);
}

export async function openRideChatAction(rideId: string): Promise<false> {
  if (!isUuid(rideId)) return false;
  const id = await openChat("open_ride_chat", { target_ride: rideId });
  if (!id) return false;
  redirect(`/crew/chat/${id}`);
}

export async function sendMessageAction(conversationId: string, text: string): Promise<SendOutcome | "unavailable"> {
  const body = typeof text === "string" ? normalizeMessage(text) : null;
  if (!isUuid(conversationId)) return "forbidden";
  if (!body) return "invalid";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("send_message", { conv: conversationId, message: body });
    if (error) return "unavailable";
    return SEND_OUTCOMES.includes(data as SendOutcome) ? (data as SendOutcome) : "unavailable";
  } catch {
    return "unavailable";
  }
}

/* Messages newer than `since` (all latest when null), and marks the chat
   read. null when the backend could not be reached. */
export async function pollMessagesAction(conversationId: string, since: string | null): Promise<ChatMessage[] | null> {
  if (!isUuid(conversationId)) return [];
  const after = typeof since === "string" && !Number.isNaN(Date.parse(since)) ? since : null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_messages", { conv: conversationId, since: after });
    if (error || !Array.isArray(data)) return null;
    const messages = (data as MessageRow[]).map(toChatMessage);
    if (messages.length > 0 || after === null) {
      await supabase.rpc("mark_conversation_read", { conv: conversationId });
    }
    return messages;
  } catch {
    return null;
  }
}
