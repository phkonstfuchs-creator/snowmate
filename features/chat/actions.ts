"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dispatchPushSoon } from "@/lib/push/dispatch";
import { isValidPosition } from "@/features/location/location";
import { isUuid, normalizeMessage, toChatMessage, type ChatMessage, type MessageRow, type SendOutcome } from "./message";

const SEND_OUTCOMES: readonly SendOutcome[] = ["sent", "forbidden", "invalid", "rate_limited", "profile_incomplete", "too_young"];

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
  /* A new chat has no messages yet and is not in the chat list; the page
     uses "with" to confirm it through open_direct_chat. */
  redirect(`/crew/chat/${id}?with=${otherUserId}`);
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
    if (data === "sent") dispatchPushSoon();
    return SEND_OUTCOMES.includes(data as SendOutcome) ? (data as SendOutcome) : "unavailable";
  } catch {
    return "unavailable";
  }
}

/* Sends the caller's current position as a pin. Who may send and see it
   is decided in the database (friends or ride members, from 16). */
export async function sendLocationAction(conversationId: string, lat: number, lng: number): Promise<SendOutcome | "unavailable"> {
  if (!isUuid(conversationId)) return "forbidden";
  if (!isValidPosition({ lat, lng, accuracy: null })) return "invalid";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("send_location_message", { conv: conversationId, p_lat: lat, p_lng: lng });
    if (error) return "unavailable";
    if (data === "sent") dispatchPushSoon();
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
