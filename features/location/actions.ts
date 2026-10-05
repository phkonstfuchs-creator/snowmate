"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isShareMinutes,
  isValidPosition,
  toFriendLocation,
  type FriendLocation,
  type FriendLocationRow,
  type Position,
  type ShareResult,
} from "./location";

const KNOWN: readonly ShareResult[] = ["sharing", "throttled", "invalid", "profile_incomplete", "too_young", "unauthenticated"];

/* Starts sharing (minutes given) or refreshes the position while sharing
   (minutes null). Who may see it is decided in the database. */
export async function shareLocationAction(position: Position, minutes: number | null): Promise<ShareResult> {
  if (!isValidPosition(position) || (minutes !== null && !isShareMinutes(minutes))) return "invalid";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("share_my_location", {
      p_lat: position.lat,
      p_lng: position.lng,
      p_accuracy: position.accuracy === null ? null : Math.min(100000, Math.round(position.accuracy)),
      p_minutes: minutes,
    });
    if (error) return "unavailable";
    return KNOWN.includes(data as ShareResult) ? (data as ShareResult) : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function stopSharingAction(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("stop_sharing_location");
    return !error;
  } catch {
    return false;
  }
}

/* Confirmed friends who are sharing right now. null when unreachable. */
export async function friendLocationsAction(): Promise<FriendLocation[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_friend_locations");
    if (error || !Array.isArray(data)) return null;
    return (data as FriendLocationRow[]).map(toFriendLocation);
  } catch {
    return null;
  }
}
