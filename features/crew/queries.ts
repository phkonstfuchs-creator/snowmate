import { createClient } from "@/lib/supabase/server";
import { groupFriendships, type FriendGraph, type FriendshipRow } from "./friendships";
import { isInviteStatus, isInviteToken, type InviteStatus } from "./invites";

/* list_my_friendships() only ever returns the caller's own graph. */
export async function getFriendGraph(): Promise<FriendGraph | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_my_friendships");

    if (error || !Array.isArray(data)) {
      return null;
    }

    return groupFriendships(data as FriendshipRow[]);
  } catch {
    return null;
  }
}

export interface PendingCounts {
  friendRequests: number;
  carpoolRequests: number;
  rideRequests: number;
}

const NONE: PendingCounts = { friendRequests: 0, carpoolRequests: 0, rideRequests: 0 };

export interface NavCounts {
  pending: PendingCounts;
  unreadChats: number;
  /* The 18th birthday has passed but the stored flag still says minor:
     only then is the write refresh_my_age() needed. */
  ageOutdated: boolean;
}

const NO_COUNTS: NavCounts = { pending: NONE, unreadChats: 0, ageOutdated: false };

/* Every navigation badge in one read-only call (my_nav_counts). No
   badges on any failure, as above. */
export async function getNavCounts(): Promise<NavCounts> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_nav_counts");
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return NO_COUNTS;
    return {
      pending: {
        friendRequests: Number(row.friend_requests) || 0,
        carpoolRequests: Number(row.carpool_requests) || 0,
        rideRequests: Number(row.ride_requests) || 0,
      },
      unreadChats: Math.max(0, Number(row.unread_chats) || 0),
      ageOutdated: row.age_outdated === true,
    };
  } catch {
    return NO_COUNTS;
  }
}

export interface InvitePreview {
  status: InviteStatus;
  inviterName: string | null;
  inviterHandle: string | null;
}

/* Signed-in only: who sent this link, and whether it still works. */
export async function previewInvite(token: string): Promise<InvitePreview | null> {
  if (!isInviteToken(token)) return { status: "not_found", inviterName: null, inviterHandle: null };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("preview_friend_invite", { invite_token: token });
    const row = Array.isArray(data) ? data[0] : null;

    if (error || !row || !isInviteStatus(row.status)) return null;

    return {
      status: row.status,
      inviterName: row.inviter_display_name ?? null,
      inviterHandle: row.inviter_handle ?? null,
    };
  } catch {
    return null;
  }
}
