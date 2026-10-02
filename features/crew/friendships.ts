import type { AbilityLevel, City } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n/translate";

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

export const FRIEND_REQUEST_MESSAGES: Record<FriendRequestOutcome, { ok: boolean; message: MessageKey }> = {
  requested: { ok: true, message: "crew.requestSent" },
  accepted: { ok: true, message: "crew.acceptedTheirs" },
  already_requested: { ok: true, message: "crew.alreadyRequested" },
  already_friends: { ok: true, message: "crew.alreadyFriends" },
  not_found: { ok: false, message: "crew.noSuchHandle" },
  self: { ok: false, message: "crew.ownHandle" },
  too_many_pending: { ok: false, message: "crew.tooManyPending" },
  profile_incomplete: { ok: false, message: "common.profileIncomplete" },
};
