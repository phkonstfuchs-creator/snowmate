import { createClient } from "@/lib/supabase/server";
import { toSkiDay, type SkiDay, type SkiDayRow } from "./ski-day";

/* The caller's saved days, newest first; null when the backend failed. */
export async function listMySkiDays(): Promise<SkiDay[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_my_ski_days", { max_rows: 60 });
    if (error || !Array.isArray(data)) return null;
    return (data as SkiDayRow[]).map(toSkiDay);
  } catch {
    return null;
  }
}
