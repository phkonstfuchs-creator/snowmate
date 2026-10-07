import { toIsoDay } from "./live-ride";

const DAY_MS = 24 * 60 * 60_000;

/** Inclusive calendar-day window for new mountain plans. */
export function isPlanningDate(isoDate: string, now: Date): boolean {
  const today = toIsoDay(now);
  const last = new Date(Date.parse(`${today}T00:00:00Z`) + 365 * DAY_MS).toISOString().slice(0, 10);
  return isoDate >= today && isoDate <= last;
}
