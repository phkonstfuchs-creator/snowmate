import { createClient } from "@/lib/supabase/server";
import { parseDayPlans, type DayPlanResult } from "./day-plan";

/* The RPC derives its subject from the authenticated session. An error or
   malformed payload remains unavailable, distinct from an empty plan list. */
export async function listMyDayPlans(): Promise<DayPlanResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_my_day_plans");
    return error ? { status: "unavailable" } : parseDayPlans(data);
  } catch {
    return { status: "unavailable" };
  }
}
