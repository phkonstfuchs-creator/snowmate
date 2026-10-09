import { z } from "zod";
import { RESORTS } from "@/lib/resorts";
import type { City } from "@/lib/types";
import { isPlanningDate } from "@/features/rides/planning-date";
import { toIsoDay } from "@/features/rides/live-ride";

export const DAY_PLAN_TRANSPORTS = ["own", "offer", "need"] as const;

export interface DayPlanInput {
  city: City;
  resort: string;
  planDate: string;
  meetTime: string;
  transport: (typeof DAY_PLAN_TRANSPORTS)[number];
  meetingText: string;
}

export interface DayPlan extends DayPlanInput {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export type DayPlanResult = { status: "ok"; plans: DayPlan[] } | { status: "unavailable" };

const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const citySchema = z.enum(["innsbruck", "salzburg"]);
const dateSchema = z.iso.date("v.pickDate");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, "v.pickTime");

const dayPlanInputSchema = z.object({
  city: citySchema,
  resort: z.string().min(1, "v.pickResort").max(60, "v.pickResort"),
  planDate: dateSchema,
  meetTime: timeSchema,
  transport: z.enum(DAY_PLAN_TRANSPORTS, "v.checkDetails"),
  meetingText: z.string().min(2, "v.addMeetPoint").max(120, "v.max|120")
    .refine((value) => value.trim() === value, "v.checkDetails")
    .refine((value) => !UNSAFE_TEXT.test(value), "v.checkDetails"),
}).strict().superRefine((value, ctx) => {
  if (!RESORTS.some((resort) => resort.city === value.city && resort.name === value.resort)) {
    ctx.addIssue({ code: "custom", path: ["resort"], message: "v.pickResort" });
  }
});

export function validateDayPlanInput(
  input: unknown,
  now: Date = new Date(),
): { success: true; data: DayPlanInput } | { success: false; message: string } {
  const parsed = dayPlanInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "v.checkDetails" };
  if (!isPlanningDate(parsed.data.planDate, now)) return { success: false, message: "v.dateWithinYear" };
  return { success: true, data: parsed.data };
}

const instantSchema = z.iso.datetime({ offset: true });

function isIsoInstant(value: unknown): value is string {
  return instantSchema.safeParse(value).success;
}

function parseDayPlan(value: unknown): DayPlan | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const expectedKeys = ["city", "createdAt", "expiresAt", "id", "meetTime", "meetingText", "planDate", "resort", "transport", "updatedAt", "version"];
  if (Object.keys(row).sort().join("|") !== expectedKeys.join("|")) return null;
  if (!ID.test(String(row.id)) || !Number.isSafeInteger(row.version) || Number(row.version) < 1
      || !isIsoInstant(row.createdAt) || !isIsoInstant(row.updatedAt) || !isIsoInstant(row.expiresAt)) return null;
  const input = dayPlanInputSchema.safeParse({
    city: row.city,
    resort: row.resort,
    planDate: row.planDate,
    meetTime: row.meetTime,
    transport: row.transport,
    meetingText: row.meetingText,
  });
  if (!input.success) return null;
  const today = toIsoDay(new Date());
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  /* Yesterday remains visible until its plan-specific expiry at Vienna
     midnight. The future limit matches the creation window. */
  const latest = new Date(Date.parse(`${today}T00:00:00Z`) + 365 * 86_400_000).toISOString().slice(0, 10);
  if (input.data.planDate < yesterday || input.data.planDate > latest) return null;
  return {
    ...input.data,
    id: String(row.id),
    version: Number(row.version),
    createdAt: new Date(row.createdAt as string).toISOString(),
    updatedAt: new Date(row.updatedAt as string).toISOString(),
    expiresAt: new Date(row.expiresAt as string).toISOString(),
  };
}

export function parseDayPlans(value: unknown): DayPlanResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { status: "unavailable" };
  const result = value as Record<string, unknown>;
  if (result.status === "unavailable") return { status: "unavailable" };
  if (result.status !== "ok" || !Array.isArray(result.plans) || result.plans.length > 20) {
    return { status: "unavailable" };
  }
  const plans = result.plans.map(parseDayPlan);
  if (plans.some((plan) => plan === null)) return { status: "unavailable" };
  const ids = new Set(plans.map((plan) => plan!.id));
  if (ids.size !== plans.length) return { status: "unavailable" };
  return { status: "ok", plans: plans as DayPlan[] };
}
