import type { MessageKey } from "@/lib/i18n/translate";

/* Report reasons as the database accepts them (reports_reason_value). */
export const REPORT_REASONS = [
  { id: "unsafe", label: "safety.reason.unsafe" },
  { id: "harassment", label: "safety.reason.harassment" },
  { id: "spam", label: "safety.reason.spam" },
  { id: "fake_profile", label: "safety.reason.fake" },
  { id: "other", label: "safety.reason.other" },
] as const satisfies readonly { id: string; label: MessageKey }[];

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.some((reason) => reason.id === value);
}

export const MAX_REPORT_DETAILS = 1000;

/* Who a report or block is about, as the screens know them. */
export interface SafetyTarget {
  userId: string;
  name: string;
  rideId?: string;
  /* A reported post is hidden for the reporter at once (ADR 0034). */
  postId?: string;
}

export interface BlockedPerson {
  userId: string;
  displayName: string | null;
  handle: string | null;
}
