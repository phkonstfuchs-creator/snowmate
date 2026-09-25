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
