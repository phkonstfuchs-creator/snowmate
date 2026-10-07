"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateApp } from "@/lib/revalidate";
import { dispatchPushSoon } from "@/lib/push/dispatch";
import { isUuid, rpcOutcome } from "@/lib/server-action";
import { SWIPE_OUTCOMES, type DeckCard, type SwipeOutcome } from "./discovery";
import { getDeck } from "./queries";

export async function swipeAction(targetId: unknown, liked: unknown): Promise<SwipeOutcome> {
  if (!isUuid(targetId) || typeof liked !== "boolean") return "invalid";
  return rpcOutcome("swipe", { target: targetId, p_liked: liked }, SWIPE_OUTCOMES, async (outcome, supabase) => {
    if (outcome !== "matched") return;
    revalidateApp();
    await dispatchPushSoon(supabase);
  });
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
