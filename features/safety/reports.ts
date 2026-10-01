/* Report reasons as the database accepts them (reports_reason_value). */
export const REPORT_REASONS = [
  { id: "unsafe", label: "Unsafe or threatening behaviour" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "spam", label: "Spam or selling" },
  { id: "fake_profile", label: "Fake profile or pretending to be someone" },
  { id: "other", label: "Something else" },
] as const;

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
}

export interface BlockedPerson {
  userId: string;
  displayName: string | null;
  handle: string | null;
}
