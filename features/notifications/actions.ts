"use server";

import { createClient } from "@/lib/supabase/server";
import { toSubscriptionInput, validPushEndpoint } from "./push-subscription";

export type PushSaveOutcome = "saved" | "invalid" | "unauthenticated" | "unavailable";

/* Ties this device to the current session. Another account's endpoint
   cannot be reassigned; the browser must unsubscribe and opt in again. */
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
  if (!validPushEndpoint(endpoint)) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint });
    return !error && data === true;
  } catch {
    return false;
  }
}

/** A browser endpoint is only "on" for the currently authenticated session. */
export async function isMyPushSubscriptionAction(endpoint: string): Promise<boolean> {
  if (!validPushEndpoint(endpoint)) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("is_my_push_subscription", { p_endpoint: endpoint });
    return !error && data === true;
  } catch {
    return false;
  }
}
