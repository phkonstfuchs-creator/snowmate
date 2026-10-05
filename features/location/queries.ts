import { createClient } from "@/lib/supabase/server";
import { friendLocationsAction } from "./actions";
import type { FriendLocation } from "./location";

/* When my current sharing ends, or null when I am not sharing. */
export async function getMySharingEnd(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_location_sharing");
    return error || typeof data !== "string" ? null : data;
  } catch {
    return null;
  }
}

/* Whether I may share at all (from 16, decided in the database). When it
   cannot be checked the share button stays; the database still refuses. */
export async function getCanShareLocation(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("can_share_my_location");
    return error ? true : data !== false;
  } catch {
    return true;
  }
}

export async function getFriendLocations(): Promise<FriendLocation[] | null> {
  return friendLocationsAction();
}
