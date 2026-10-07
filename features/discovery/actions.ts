"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateApp } from "@/lib/revalidate";
import { dispatchPushSoon } from "@/lib/push/dispatch";
import { SWIPE_OUTCOMES, type DeckCard, type SwipeOutcome } from "./discovery";
import { getDeck } from "./queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export async function swipeAction(targetId: unknown, liked: unknown): Promise<SwipeOutcome> {
  if (typeof targetId !== "string" || !UUID.test(targetId) || typeof liked !== "boolean") return "invalid";
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("swipe", { target: targetId, p_liked: liked });
    if (error) return "unavailable";
    if (data === "matched") {
      revalidateApp();
      await dispatchPushSoon(supabase);
    }
    return SWIPE_OUTCOMES.includes(data as SwipeOutcome) ? (data as SwipeOutcome) : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function deckAction(): Promise<DeckCard[] | null> {
  return getDeck();
}

/* Appear in other people's decks (and get a deck yourself), or not. */
export async function setDiscoverableAction(on: unknown): Promise<boolean> {
  if (typeof on !== "boolean") return false;
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (typeof userId !== "string") return false;
    const { error } = await supabase.from("profiles").update({ discoverable: on }).eq("id", userId);
    if (error) return false;
    revalidateApp();
    return true;
  } catch {
    return false;
  }
}
