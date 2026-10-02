import { createClient } from "@/lib/supabase/server";
import type { BlockedPerson } from "./reports";

export async function listMyBlocks(): Promise<BlockedPerson[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_my_blocks");
    if (error || !Array.isArray(data)) return null;
    return data.map((row) => ({
      userId: String(row.user_id),
      displayName: row.display_name ?? null,
      handle: row.handle ?? null,
    }));
  } catch {
    return null;
  }
}
