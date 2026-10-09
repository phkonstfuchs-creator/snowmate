import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/server-action";
import {
  parseGoOverview,
  parseGoStatus,
  type GoOverviewResult,
  type GoStatusResult,
} from "./go-status";
export async function listMyGoInterests(limit = 20): Promise<GoOverviewResult> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    return { status: "unavailable" };
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("list_my_ride_go_interests", {
      p_limit: limit,
    });
    const interests = parseGoOverview(data);
    return !error && interests && interests.length <= limit
      ? { status: "ok", interests }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
export async function getGoStatus(rideId: string): Promise<GoStatusResult> {
  if (!isUuid(rideId)) return { status: "unavailable" };
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("get_ride_go_status", {
      target_ride: rideId,
    });
    const wish = parseGoStatus(data, rideId);
    return !error && wish !== undefined
      ? { status: "ok", wish }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
