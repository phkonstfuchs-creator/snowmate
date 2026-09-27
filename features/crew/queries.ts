import { createClient } from "@/lib/supabase/server";
import { groupFriendships, type FriendGraph, type FriendshipRow } from "./friendships";

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
}

/* What is waiting for the caller, for the navigation badges. Zero on any
   failure: a missing badge is better than a broken app shell. */
export async function getPendingCounts(): Promise<PendingCounts> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_pending_counts");
    const row = Array.isArray(data) ? data[0] : null;

    if (error || !row) return { friendRequests: 0, carpoolRequests: 0 };

    return {
      friendRequests: Number(row.friend_requests) || 0,
      carpoolRequests: Number(row.carpool_requests) || 0,
    };
  } catch {
    return { friendRequests: 0, carpoolRequests: 0 };
  }
}
