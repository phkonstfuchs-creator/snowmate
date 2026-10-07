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

const APNS_TOKEN = /^[0-9a-f]{64,200}$/u;

/* The store apps' iPhone token (ADR 0031), bound to this session like a
   web subscription. */
export async function saveNativePushTokenAction(token: unknown): Promise<PushSaveOutcome> {
  if (typeof token !== "string" || !APNS_TOKEN.test(token.toLowerCase())) return "invalid";
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_native_push_token", { p_token: token.toLowerCase(), p_platform: "ios" });
    if (error) return "unavailable";
    return data === "saved" || data === "invalid" || data === "unauthenticated" ? data : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function deleteNativePushTokenAction(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !APNS_TOKEN.test(token.toLowerCase())) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("delete_native_push_token", { p_token: token.toLowerCase() });
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function isMyNativePushTokenAction(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !APNS_TOKEN.test(token.toLowerCase())) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("is_my_native_push_token", { p_token: token.toLowerCase() });
    return !error && data === true;
  } catch {
    return false;
  }
}
