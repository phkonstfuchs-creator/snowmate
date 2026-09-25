import { createClient } from "@/lib/supabase/server";
import { toLiveRide, type LiveRide, type RideRow } from "./live-ride";

export type RidesResult =
  | { status: "ok"; rides: LiveRide[] }
  | { status: "unavailable" };

/* Every ride read goes through list_rides(), which applies the audience
   and meeting-point rules in the database. Nothing here filters for
   safety; it only reshapes. */
export async function listRides(now: Date = new Date()): Promise<RidesResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_rides");

    if (error || !Array.isArray(data)) {
      return { status: "unavailable" };
    }

    return { status: "ok", rides: (data as RideRow[]).map((row) => toLiveRide(row, now)) };
  } catch {
    return { status: "unavailable" };
  }
}
