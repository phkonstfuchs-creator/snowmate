import { createClient } from "@/lib/supabase/server";
import { toLeaderboardRow, type LeaderboardDbRow, type LeaderboardMetric, type LeaderboardRow, type LeaderboardScope, type LeaderboardSettings } from "./leaderboard";

/* null when the backend failed (or the leaderboard is not set up yet). */
export async function getLeaderboard(scope: LeaderboardScope, metric: LeaderboardMetric): Promise<LeaderboardRow[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("leaderboard", { scope, metric });
    if (error || !Array.isArray(data)) return null;
    return (data as LeaderboardDbRow[]).map(toLeaderboardRow);
  } catch {
    return null;
  }
}

/* The caller's own leaderboard choices; null when unavailable. */
export async function getLeaderboardSettings(): Promise<LeaderboardSettings | null> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (typeof userId !== "string") return null;
    const { data, error } = await supabase.from("profiles").select("leaderboard_friends, leaderboard_region").eq("id", userId).maybeSingle();
    if (error || !data) return null;
    const row = data as { leaderboard_friends: boolean | null; leaderboard_region: boolean | null };
    return { friends: row.leaderboard_friends !== false, region: row.leaderboard_region === true };
  } catch {
    return null;
  }
}
