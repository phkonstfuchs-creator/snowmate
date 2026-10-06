import { createClient } from "@/lib/supabase/server";
import { toDeckCard, type DeckCard, type DeckRow } from "./discovery";

/* The caller's deck; null when the backend failed. */
export async function getDeck(): Promise<DeckCard[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("discovery_deck");
    if (error || !Array.isArray(data)) return null;
    return (data as DeckRow[]).map(toDeckCard);
  } catch {
    return null;
  }
}

/* Whether the caller switched discovery on; null when unavailable. */
export async function getDiscoverable(): Promise<boolean | null> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (typeof userId !== "string") return null;
    const { data, error } = await supabase.from("profiles").select("discoverable").eq("id", userId).maybeSingle();
    if (error || !data) return null;
    return (data as { discoverable: boolean | null }).discoverable === true;
  } catch {
    return null;
  }
}
