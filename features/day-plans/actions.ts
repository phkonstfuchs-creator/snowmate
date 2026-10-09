"use server";

import { createClient } from "@/lib/supabase/server";
import { isBlockedText, isUuid } from "@/lib/server-action";
import { revalidateApp } from "@/lib/revalidate";
import { parseDayPlans, validateDayPlanInput, type DayPlan } from "./day-plan";

type DayPlanActionResult = { ok: boolean; message: string; plan?: DayPlan };
const UNAVAILABLE: DayPlanActionResult = { ok: false, message: "common.unavailable" };

function validVersion(version: number): boolean {
  return Number.isSafeInteger(version) && version >= 0;
}

function parseSavedPlan(value: unknown): DayPlan | null {
  const parsed = parseDayPlans({ status: "ok", plans: [value] });
  return parsed.status === "ok" ? parsed.plans[0] ?? null : null;
}

export async function saveDayPlan(id: string, expectedVersion: number, input: unknown): Promise<DayPlanActionResult> {
  if (!isUuid(id) || !validVersion(expectedVersion)) return { ok: false, message: "v.checkDetails" };
  const validation = validateDayPlanInput(input);
  if (!validation.success) return { ok: false, message: validation.message };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_day_plan", {
      target_id: id,
      expected_version: expectedVersion,
      plan: validation.data,
    });
    if (error) return isBlockedText(error) ? { ok: false, message: "common.blockedText" } : UNAVAILABLE;
    if (typeof data !== "object" || data === null || Array.isArray(data)) return UNAVAILABLE;
    const result = data as Record<string, unknown>;
    if (result.status === "saved") {
      const plan = parseSavedPlan(result.plan);
      if (!plan || plan.id !== id || Object.entries(validation.data).some(([key, value]) => plan[key as keyof typeof plan] !== value)) {
        return UNAVAILABLE;
      }
      await revalidateApp();
      return { ok: true, message: "dayPlan.saved", plan };
    }
    const messages: Record<string, string> = {
      conflict: "dayPlan.conflict",
      limit: "dayPlan.limit",
      rate_limited: "dayPlan.rateLimited",
      profile_incomplete: "common.profileIncomplete",
      blocked_text: "common.blockedText",
      invalid: "v.checkDetails",
    };
    const status = typeof result.status === "string" ? result.status : "";
    return Object.hasOwn(messages, status) ? { ok: false, message: messages[status]! } : UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}

export async function deleteDayPlan(id: string, expectedVersion: number): Promise<DayPlanActionResult> {
  if (!isUuid(id) || !validVersion(expectedVersion)) return { ok: false, message: "v.checkDetails" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("delete_day_plan", { target_id: id, expected_version: expectedVersion });
    if (error) return UNAVAILABLE;
    const status = typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>).status
      : data;
    if (status === "deleted" || status === "missing") {
      await revalidateApp();
      return { ok: true, message: "dayPlan.deleted" };
    }
    if (status === "conflict") return { ok: false, message: "dayPlan.conflict" };
    if (status === "invalid") return { ok: false, message: "v.checkDetails" };
    return UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}
