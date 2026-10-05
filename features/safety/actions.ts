"use server";

import { getT } from "@/lib/i18n/server";
import { translateValidation } from "@/lib/i18n/translate";
import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { MAX_REPORT_DETAILS, isReportReason } from "./reports";

export type SafetyActionResult = { ok: boolean; message: string };

const UNAVAILABLE: SafetyActionResult = { ok: false, message: "common.unavailable" };

/* A block changes what every social screen shows. */
function revalidateSocial() {
  revalidateApp();
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, args);
    return error ? null : { data };
  } catch {
    return null;
  }
}

async function blockUserActionImpl(userId: string): Promise<SafetyActionResult> {
  if (!userId) return UNAVAILABLE;
  const result = await rpc("block_user", { target: userId });
  if (!result) return UNAVAILABLE;
  if (result.data !== "blocked") return { ok: false, message: "safety.cannotBlock" };
  revalidateSocial();
  return { ok: true, message: "safety.blocked" };
}

async function unblockUserActionImpl(userId: string): Promise<SafetyActionResult> {
  if (!userId) return UNAVAILABLE;
  const result = await rpc("unblock_user", { target: userId });
  if (!result) return UNAVAILABLE;
  revalidateSocial();
  return result.data === true
    ? { ok: true, message: "safety.unblocked" }
    : { ok: false, message: "safety.notBlocked" };
}

async function reportUserActionImpl(input: {
  userId: string;
  reason: string;
  details?: string;
  rideId?: string;
  alsoBlock?: boolean;
}): Promise<SafetyActionResult> {
  if (!input.userId || !isReportReason(input.reason)) {
    return { ok: false, message: "v.pickReason" };
  }
  const details = (input.details ?? "").trim();
  if (details.length > MAX_REPORT_DETAILS) {
    return { ok: false, message: `v.max|${MAX_REPORT_DETAILS}` };
  }

  const result = await rpc("report_user", {
    target: input.userId,
    reason: input.reason,
    details: details || null,
    ride: input.rideId ?? null,
    also_block: input.alsoBlock === true,
  });
  if (!result) return UNAVAILABLE;

  switch (result.data) {
    case "reported":
      if (input.alsoBlock) revalidateSocial();
      return {
        ok: true,
        message: input.alsoBlock
          ? "safety.reportedAndBlocked"
          : "safety.reported",
      };
    case "too_many":
      return { ok: false, message: "safety.tooMany" };
    default:
      return { ok: false, message: "safety.cannotReport" };
  }
}

/* Results carry message keys; the exported actions translate them once,
   in the caller's language. */
async function localize<T>(result: T): Promise<T> {
  if (typeof result !== "object" || result === null || !("message" in result)) return result;
  const t = await getT();
  return { ...result, message: translateValidation(t, String(result.message)) };
}

export async function blockUserAction(userId: string): Promise<SafetyActionResult> {
  return localize(await blockUserActionImpl(userId));
}

export async function unblockUserAction(userId: string): Promise<SafetyActionResult> {
  return localize(await unblockUserActionImpl(userId));
}

export async function reportUserAction(input: {
  userId: string;
  reason: string;
  details?: string;
  rideId?: string;
  alsoBlock?: boolean;
}): Promise<SafetyActionResult> {
  return localize(await reportUserActionImpl(input));
}
