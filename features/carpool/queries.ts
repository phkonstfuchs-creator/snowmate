import { createClient } from "@/lib/supabase/server";
import { toLiveCarpool, type CarpoolRow, type LiveCarpool } from "./live-carpool";

/* list_carpools() applies the audience and pickup-spot rules in the
   database; this only reshapes. Null means the backend is unreachable. */
export async function listCarpools(now: Date = new Date()): Promise<LiveCarpool[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_carpools");

    if (error || !Array.isArray(data)) return null;

    return (data as CarpoolRow[]).map((row) => toLiveCarpool(row, now));
  } catch {
    return null;
  }
}
