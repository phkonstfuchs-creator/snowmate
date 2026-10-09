import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  parseLiveLocationRows,
  parseResortPresenceRows,
  type LiveLocation,
  type ResortPresence,
} from "./dto";

export type LocationDataResult<T> =
  | Readonly<{ status: "ready"; data: T }>
  | Readonly<{ status: "unavailable" }>;

const resortFilterSchema = z
  .string()
  .regex(/^[a-z0-9-]{2,64}$/)
  .optional();

async function getLocationRows<T>(
  rpcName: "get_resort_presence" | "get_live_locations",
  resortId: string | undefined,
  parse: (value: unknown) => T[] | null,
): Promise<LocationDataResult<T[]>> {
  const filter = resortFilterSchema.safeParse(resortId);
  if (!filter.success) return { status: "unavailable" };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(rpcName, {
      p_limit: 100,
      p_resort_id: filter.data ?? null,
    });
    if (error) return { status: "unavailable" };

    const parsed = parse(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export function getResortPresence(
  resortId?: string,
): Promise<LocationDataResult<ResortPresence[]>> {
  return getLocationRows(
    "get_resort_presence",
    resortId,
    parseResortPresenceRows,
  );
}

export function getLiveLocations(
  resortId?: string,
): Promise<LocationDataResult<LiveLocation[]>> {
  return getLocationRows("get_live_locations", resortId, parseLiveLocationRows);
}
