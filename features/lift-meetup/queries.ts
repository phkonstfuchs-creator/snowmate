import { createClient } from "@/lib/supabase/server";
import { toLiftMeetup, type LiftMeetup, type LiftMeetupRow } from "./meetup";

async function readMeetups(functionName: "my_lift_meetup" | "list_friend_lift_meetups"): Promise<LiftMeetup[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(functionName);
    if (error || !Array.isArray(data)) return null;
    return (data as LiftMeetupRow[]).map(toLiftMeetup);
  } catch {
    return null;
  }
}

export async function getMyLiftMeetup(): Promise<LiftMeetup | null> {
  return (await readMeetups("my_lift_meetup"))?.[0] ?? null;
}

export async function getFriendLiftMeetups(): Promise<LiftMeetup[] | null> {
  return readMeetups("list_friend_lift_meetups");
}

export async function getCanShareLiftMeetup(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("can_share_my_location");
    return !error && data === true;
  } catch {
    return false;
  }
}
