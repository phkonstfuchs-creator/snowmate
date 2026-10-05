"use server";

import { createClient } from "@/lib/supabase/server";
import { toSubscriptionInput } from "./push-subscription";

export type PushSaveOutcome = "saved" | "invalid" | "unauthenticated" | "unavailable";

/* Ties this device to the signed-in account (or moves it from another
   account that used the same browser). */
export async function savePushSubscriptionAction(subscription: unknown): Promise<PushSaveOutcome> {
  const input = toSubscriptionInput(subscription);
  if (!input) return "invalid";
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: input.endpoint,
      p_p256dh: input.p256dh,
      p_auth: input.auth,
    });
    if (error) return "unavailable";
    return data === "saved" || data === "invalid" || data === "unauthenticated" ? data : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<boolean> {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint });
    return !error;
  } catch {
    return false;
  }
}
