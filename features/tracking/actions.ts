"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateApp } from "@/lib/revalidate";
import { isUuid, rpcOutcome } from "@/lib/server-action";
import { RESORTS } from "@/lib/resorts";
import { isPlausibleSummary, type SaveSkiDayOutcome } from "./ski-day";

const OUTCOMES: readonly SaveSkiDayOutcome[] = ["saved", "invalid", "rate_limited", "unauthenticated"];

/* Saves the summary of a tracked day. Only the summary: the GPS track
   stays on the phone. */
export async function saveSkiDayAction(summary: unknown, resort: unknown): Promise<SaveSkiDayOutcome> {
  if (!isPlausibleSummary(summary, Date.now())) return "invalid";
  const place = typeof resort === "string" && RESORTS.some((r) => r.name === resort) ? resort : null;
  return rpcOutcome("save_ski_day", {
    p_resort: place,
    p_started_at: summary.startedAt,
    p_ended_at: summary.endedAt,
    p_distance_m: summary.distanceM,
    p_vertical_m: summary.verticalM,
    p_max_speed_kmh: summary.maxSpeedKmh,
    p_runs: summary.runs,
  }, OUTCOMES, (outcome) => {
    if (outcome === "saved") revalidateApp();
  });
}

export async function deleteSkiDayAction(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("delete_my_ski_day", { p_id: id });
    if (error || data !== true) return false;
    revalidateApp();
    return true;
  } catch {
    return false;
  }
}
