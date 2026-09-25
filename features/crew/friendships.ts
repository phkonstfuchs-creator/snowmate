import type { AbilityLevel, City } from "@/lib/types";

export interface FriendshipRow {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  city: City | null;
  ability_level: AbilityLevel | null;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
}

export interface FriendGraph {
  friends: FriendshipRow[];
  incoming: FriendshipRow[];
  outgoing: FriendshipRow[];
}

export function groupFriendships(rows: readonly FriendshipRow[]): FriendGraph {
  return {
    friends: rows.filter((row) => row.status === "accepted"),
    incoming: rows.filter((row) => row.status === "pending" && row.direction === "incoming"),
    outgoing: rows.filter((row) => row.status === "pending" && row.direction === "outgoing"),
  };
}

export type FriendRequestOutcome =
  | "requested"
  | "accepted"
  | "already_requested"
  | "already_friends"
  | "not_found"
  | "self"
  | "profile_incomplete"
  | "too_many_pending";

export const FRIEND_REQUEST_MESSAGES: Record<FriendRequestOutcome, { ok: boolean; message: string }> = {
  requested: { ok: true, message: "Request sent." },
  accepted: { ok: true, message: "They had already asked you. You are friends now." },
  already_requested: { ok: true, message: "You already asked. Waiting for them." },
  already_friends: { ok: true, message: "You are already friends." },
  not_found: { ok: false, message: "No rider with that handle." },
  self: { ok: false, message: "That is your own handle." },
  too_many_pending: { ok: false, message: "You have 20 requests waiting for an answer. Withdraw some first." },
  profile_incomplete: { ok: false, message: "Finish your profile first: add your name and handle on the Profile tab." },
};
