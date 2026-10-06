import type { Lift } from "@/lib/lifts";

const MAX_ROUTE_POSITION_ACCURACY_METERS = 100;

export function canSuggestFromPosition(accuracyMeters: number | null): boolean {
  return accuracyMeters !== null && Number.isFinite(accuracyMeters) &&
    accuracyMeters >= 0 && accuracyMeters <= MAX_ROUTE_POSITION_ACCURACY_METERS;
}

export interface WaitEstimateOptions {
  at: Date;
  /** Caller supplies this only from a verified holiday calendar. */
  isSchoolHoliday?: boolean;
  newSnowCm?: number;
}

// Heuristic only: no live queue or visitor counts exist. The Vienna clock
// matches the resort day boundary used elsewhere in the product.
export function estimateLiftWaitMinutes({ at, isSchoolHoliday = false, newSnowCm }: WaitEstimateOptions): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna", weekday: "short", hour: "numeric", hourCycle: "h23",
  }).formatToParts(at);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const weekend = weekday === "Sat" || weekday === "Sun";
  const baseline = hour >= 8 && hour < 11 ? 4 : hour >= 11 && hour < 14 ? 2 : 1;
  const reportedSnow = typeof newSnowCm === "number" && Number.isFinite(newSnowCm) && newSnowCm >= 0
    ? newSnowCm : 0;
  const snow = reportedSnow >= 25 ? 6 : reportedSnow >= 10 ? 3 : 0;
  return Math.min(20, baseline + (weekend ? 6 : 0) + (isSchoolHoliday ? 4 : 0) + snow);
}

export function estimateLiftArrival(
  lift: Lift,
  at: Date,
  options: Omit<WaitEstimateOptions, "at"> = {},
): Date {
  const minutes = estimateLiftWaitMinutes({ at, ...options }) + lift.durationMinutes;
  return new Date(at.getTime() + Math.round(minutes * 60_000));
}

const radians = (degrees: number): number => degrees * Math.PI / 180;

export function straightLineMeters(a: readonly [number, number], b: readonly [number, number]): number {
  const deltaLat = radians(b[0] - a[0]);
  const deltaLon = radians(b[1] - a[1]);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const haversine = sinLat * sinLat + Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * sinLon * sinLon;
  return 12_742_000 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export interface MeetingLiftSuggestion {
  lift: Lift;
  distanceToBottomMeters: number;
  distanceFromTopMeters: number;
  arrivalAt: Date;
}

export function suggestMeetingLift(
  lifts: readonly Lift[],
  targetTopCoordinates: readonly [number, number],
  viewerCoordinates: readonly [number, number],
  at: Date,
  options: Omit<WaitEstimateOptions, "at"> = {},
): MeetingLiftSuggestion | undefined {
  const candidates = lifts.map((lift) => ({
    lift,
    distanceToBottomMeters: straightLineMeters(viewerCoordinates, lift.bottomCoordinates),
    distanceFromTopMeters: straightLineMeters(lift.topCoordinates, targetTopCoordinates),
  })).filter((candidate) => candidate.distanceToBottomMeters <= 2_000 && candidate.distanceFromTopMeters <= 300);
  const suggestions = candidates.map((candidate) => {
    // A straight-line approach is optimistic on mountain terrain. 1.2 m/s is
    // a conservative pace; the UI must still label this an approximation.
    const approachMinutes = candidate.distanceToBottomMeters / 72;
    const boardingAt = new Date(at.getTime() + Math.round(approachMinutes * 60_000));
    return { ...candidate, arrivalAt: estimateLiftArrival(candidate.lift, boardingAt, options) };
  });
  return suggestions.reduce<MeetingLiftSuggestion | undefined>((nearest, candidate) =>
    !nearest || candidate.distanceToBottomMeters < nearest.distanceToBottomMeters ? candidate : nearest,
  undefined);
}
