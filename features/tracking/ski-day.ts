import type { SkiDaySummary } from "./tracker";

/* A saved ski day (ADR 0026). The database checks the same limits. */

export interface SkiDay extends SkiDaySummary {
  id: string;
  resort: string | null;
}

export interface SkiDayRow {
  id: string;
  resort: string | null;
  started_at: string;
  ended_at: string;
  distance_m: number;
  vertical_m: number;
  max_speed_kmh: number | string;
  runs: number;
}

export type SaveSkiDayOutcome = "saved" | "invalid" | "rate_limited" | "unauthenticated" | "unavailable";

export interface SeasonTotals {
  days: number;
  distanceM: number;
  verticalM: number;
  runs: number;
  maxSpeedKmh: number;
}

export function toSkiDay(row: SkiDayRow): SkiDay {
  return {
    id: row.id,
    resort: row.resort,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceM: row.distance_m,
    verticalM: row.vertical_m,
    maxSpeedKmh: Number(row.max_speed_kmh),
    runs: row.runs,
  };
}

export function isPlausibleSummary(value: unknown, now: number): value is SkiDaySummary {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const start = typeof v.startedAt === "string" ? Date.parse(v.startedAt) : NaN;
  const end = typeof v.endedAt === "string" ? Date.parse(v.endedAt) : NaN;
  const int = (x: unknown, max: number) => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= max;
  return (
    Number.isFinite(start) && Number.isFinite(end) && end > start && end - start <= 16 * 3600_000 &&
    start >= now - 36 * 3600_000 && end <= now + 5 * 60_000 &&
    int(v.distanceM, 250_000) && int(v.verticalM, 25_000) && int(v.runs, 200) &&
    typeof v.maxSpeedKmh === "number" && Number.isFinite(v.maxSpeedKmh) && v.maxSpeedKmh >= 0 && v.maxSpeedKmh <= 150
  );
}

/* Ski seasons run from September to August. */
export function seasonStart(now: Date): Date {
  const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 8, 1));
}

export function seasonTotals(days: readonly SkiDay[], now: Date): SeasonTotals {
  const from = seasonStart(now).getTime();
  return days
    .filter((day) => Date.parse(day.startedAt) >= from)
    .reduce<SeasonTotals>(
      (sum, day) => ({
        days: sum.days + 1,
        distanceM: sum.distanceM + day.distanceM,
        verticalM: sum.verticalM + day.verticalM,
        runs: sum.runs + day.runs,
        maxSpeedKmh: Math.max(sum.maxSpeedKmh, day.maxSpeedKmh),
      }),
      { days: 0, distanceM: 0, verticalM: 0, runs: 0, maxSpeedKmh: 0 },
    );
}

export function formatKm(metres: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: metres < 10_000 ? 1 : 0 }).format(metres / 1000);
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
