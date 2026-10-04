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

export async function getFriendLocations(): Promise<FriendLocation[] | null> {
  return friendLocationsAction();
}
