import { createClient } from "@/lib/supabase/server";
import type { DataResult } from "@/features/rides/data";
import { parseGoStatus, type GoStatus } from "./dto";
export async function getGoStatus(
  rideId: string,
): Promise<DataResult<GoStatus | null>> {
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("get_ride_go_status", {
      p_ride_id: rideId,
    });
    if (error) return { status: "unavailable" };
    if (data === null) return { status: "ready", data: null };
    const parsed = parseGoStatus(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
