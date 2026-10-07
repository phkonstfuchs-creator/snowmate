/* Chat rules shared by the screens and the server actions. The database
   checks the same rules again (send_message). */
export const MAX_MESSAGE_LENGTH = 1000;
export const POLL_INTERVAL_MS = 4000;

const FORBIDDEN_CHARS = /[\u0001-\u0009\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type SendOutcome = "sent" | "forbidden" | "invalid" | "blocked" | "rate_limited" | "profile_incomplete" | "too_young";

/* The stored text of a location message; the list shows a label instead. */
export const LOCATION_BODY = "📍";

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/* The text as it will be stored, or null when it cannot be sent. */
export function normalizeMessage(text: string): string | null {
  const clean = text.replace(/^[\s]+|[\s]+$/gu, "");
  if (clean.length === 0 || [...clean].length > MAX_MESSAGE_LENGTH) return null;
  if (FORBIDDEN_CHARS.test(clean)) return null;
  return clean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  kind: "text" | "location";
  /* Location messages: the pin, or null once it is older than 24 h. */
  position: { lat: number; lng: number } | null;
}

export interface ChatSummary {
  id: string;
  kind: "direct" | "ride";
  otherUserId: string | null;
  otherName: string | null;
  otherHandle: string | null;
  rideId: string | null;
  rideResort: string | null;
  rideDate: string | null;
  lastBody: string | null;
  lastAt: string | null;
  lastIsMine: boolean;
  unread: number;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_handle: string | null;
  body: string;
  created_at: string;
  is_mine: boolean;
  kind?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ConversationRow {
  conversation_id: string;
  kind: string;
  other_user_id: string | null;
  other_name: string | null;
  other_handle: string | null;
  ride_id: string | null;
  ride_resort: string | null;
  ride_date: string | null;
  last_body: string | null;
  last_at: string | null;
  last_is_mine: boolean | null;
  unread: number | null;
}

export function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? (row.sender_handle ? `@${row.sender_handle}` : "Rider"),
    body: row.body,
    createdAt: row.created_at,
    isMine: row.is_mine === true,
    kind: row.kind === "location" ? "location" : "text",
    position:
      row.kind === "location" && Number.isFinite(row.lat) && Number.isFinite(row.lng)
        ? { lat: row.lat as number, lng: row.lng as number }
        : null,
  };
}

export function toChatSummary(row: ConversationRow): ChatSummary {
  return {
    id: row.conversation_id,
    kind: row.kind === "ride" ? "ride" : "direct",
    otherUserId: row.other_user_id,
    otherName: row.other_name,
    otherHandle: row.other_handle,
    rideId: row.ride_id,
    rideResort: row.ride_resort,
    rideDate: row.ride_date,
    lastBody: row.last_body,
    lastAt: row.last_at,
    lastIsMine: row.last_is_mine === true,
    unread: Math.max(0, Number(row.unread) || 0),
  };
}

/* New messages from a poll, appended without duplicates, oldest first. */
export function mergeMessages(current: readonly ChatMessage[], incoming: readonly ChatMessage[]): ChatMessage[] {
  const seen = new Set(current.map((message) => message.id));
  const added = incoming.filter((message) => !seen.has(message.id));
  if (added.length === 0) return current as ChatMessage[];
  return [...current, ...added].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
