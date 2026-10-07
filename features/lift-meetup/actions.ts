"use server";

import { createClient } from "@/lib/supabase/server";
import { findLift } from "@/lib/lifts";
import { dispatchPushSoon } from "@/lib/push/dispatch";
import { rpcOutcome } from "@/lib/server-action";
import { toLiftMeetup, type LiftMeetup, type LiftMeetupRow, type StartResult } from "./meetup";

const KNOWN_RESULTS: readonly StartResult[] = ["sharing", "invalid", "profile_incomplete", "too_young", "unauthenticated"];

export async function startLiftMeetupAction(resort: string, liftId: string): Promise<StartResult> {
  if (typeof resort !== "string" || typeof liftId !== "string" || resort.length > 100 || liftId.length > 100) return "invalid";
  const lift = findLift(resort, liftId);
  if (!lift) return "invalid";
  return rpcOutcome("start_my_lift_meetup", { p_resort: lift.resort, p_lift_id: lift.id }, KNOWN_RESULTS, async (result, supabase) => {
    if (result === "sharing") await dispatchPushSoon(supabase);
  });
}

export async function stopLiftMeetupAction(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("stop_my_lift_meetup");
    return !error;
  } catch {
    return false;
  }
}

export async function friendLiftMeetupsAction(): Promise<LiftMeetup[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_friend_lift_meetups");
    if (error || !Array.isArray(data)) return null;
    return (data as LiftMeetupRow[]).map(toLiftMeetup);
  } catch {
    return null;
  }
}

export async function myLiftMeetupAction(): Promise<LiftMeetup | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_lift_meetup");
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return toLiftMeetup(data[0] as LiftMeetupRow);
  } catch {
    return null;
  }
}
