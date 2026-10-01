"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_REPORT_DETAILS, isReportReason } from "./reports";

export type SafetyActionResult = { ok: boolean; message: string };

const UNAVAILABLE: SafetyActionResult = { ok: false, message: "That did not work. Try again shortly." };

/* A block changes what every social screen shows. */
function revalidateSocial() {
  ["/feed", "/events", "/map", "/carpool", "/crew", "/profile"].forEach((path) => revalidatePath(path));
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

export async function blockUserAction(userId: string): Promise<SafetyActionResult> {
  if (!userId) return UNAVAILABLE;
  const result = await rpc("block_user", { target: userId });
  if (!result) return UNAVAILABLE;
  if (result.data !== "blocked") return { ok: false, message: "You cannot block this person." };
  revalidateSocial();
  return { ok: true, message: "Blocked. You will not see each other anymore." };
}

export async function unblockUserAction(userId: string): Promise<SafetyActionResult> {
  if (!userId) return UNAVAILABLE;
  const result = await rpc("unblock_user", { target: userId });
  if (!result) return UNAVAILABLE;
  revalidateSocial();
  return result.data === true
    ? { ok: true, message: "Unblocked." }
    : { ok: false, message: "This person was not blocked." };
}

export async function reportUserAction(input: {
  userId: string;
  reason: string;
  details?: string;
  rideId?: string;
  alsoBlock?: boolean;
}): Promise<SafetyActionResult> {
  if (!input.userId || !isReportReason(input.reason)) {
    return { ok: false, message: "Pick a reason." };
  }
  const details = (input.details ?? "").trim();
  if (details.length > MAX_REPORT_DETAILS) {
    return { ok: false, message: `Use at most ${MAX_REPORT_DETAILS} characters.` };
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
          ? "Thanks. We will look at it, and you will not see each other anymore."
          : "Thanks. We will look at it.",
      };
    case "too_many":
      return { ok: false, message: "You have sent many reports today. Try again tomorrow." };
    default:
      return { ok: false, message: "You cannot report this person." };
  }
}
