import { createClient } from "@/lib/supabase/server";
import type { DataResult } from "@/features/rides/data";
import {
  parseGoStatus,
  parseOwnGoInterests,
  type GoStatus,
  type GoInterestSummary,
} from "./dto";
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

export async function getOwnGoInterests(
  limit = 20,
): Promise<DataResult<readonly GoInterestSummary[]>> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return { status: "unavailable" };
  }
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("get_own_ride_go_interests", {
      p_limit: limit,
    });
    if (error) return { status: "unavailable" };
    const parsed = parseOwnGoInterests(data);
    return parsed && parsed.length <= limit
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
