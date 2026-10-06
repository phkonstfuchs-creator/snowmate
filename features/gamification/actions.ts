"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateApp } from "@/lib/revalidate";
import { isMetric, isScope, type LeaderboardRow } from "./leaderboard";
import { getLeaderboard } from "./queries";

export async function leaderboardAction(scope: unknown, metric: unknown): Promise<LeaderboardRow[] | null> {
  if (!isScope(scope) || !isMetric(metric)) return null;
  return getLeaderboard(scope, metric);
}

/* "Show me to friends" and "join my region's board". Only the caller's
   own row, only these two columns (column grants in the database). */
export async function setLeaderboardSettingAction(setting: unknown, on: unknown): Promise<boolean> {
  if ((setting !== "friends" && setting !== "region") || typeof on !== "boolean") return false;
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (typeof userId !== "string") return false;
    const column = setting === "friends" ? "leaderboard_friends" : "leaderboard_region";
    const { error } = await supabase.from("profiles").update({ [column]: on }).eq("id", userId);
    if (error) return false;
    revalidateApp();
    return true;
  } catch {
    return false;
  }
}
