/* Turns GPS fixes into a ski-day summary (ADR 0026). Pure: the hook
   feeds it fixes, the tests feed it synthetic days. The raw track never
   leaves the device; only the summary is saved.

   - Lift or ski: a segment climbing faster than LIFT_CLIMB_MS is a lift
     and adds no distance or speed.
   - Runs: altitude with hysteresis. Dropping RUN_ENTER_M below the last
     top starts a run; climbing RUN_EXIT_M above its lowest point ends
     it. A run counts if it dropped at least RUN_MIN_DROP_M.
   - Bad fixes (inaccurate, impossible speed) are skipped. A gap longer
     than GAP_S (screen locked, tunnel) is bridged without distance. */

export interface Fix {
  lat: number;
  lng: number;
  /* metres above sea level, null when the device does not report it */
  alt: number | null;
  /* metres */
  accuracy: number;
  /* m/s from the device (Doppler), null when not reported */
  speed: number | null;
  /* epoch ms */
  t: number;
}

export interface TrackerState {
  startedAt: number;
  last: { lat: number; lng: number; t: number } | null;
  alt: number | null;
  distanceM: number;
  maxSpeedMs: number;
  runs: number;
  verticalDoneM: number;
  mode: "up" | "down";
  top: number | null;
  low: number | null;
  /* thinned track for the map, [lng, lat] */
  track: [number, number][];
}

export interface SkiDaySummary {
  startedAt: string;
  endedAt: string;
  distanceM: number;
  verticalM: number;
  maxSpeedKmh: number;
  runs: number;
}

export const MAX_ACCURACY_M = 35;
export const MAX_SPEED_MS = 150 / 3.6;
export const GAP_S = 120;
export const LIFT_CLIMB_MS = 0.5;
export const RUN_ENTER_M = 30;
export const RUN_EXIT_M = 30;
export const RUN_MIN_DROP_M = 50;
const ALT_SMOOTHING = 0.35;
const TRACK_STEP_M = 15;
const TRACK_MAX_POINTS = 4000;

export function startTracker(now: number): TrackerState {
  return {
    startedAt: now,
    last: null,
    alt: null,
    distanceM: 0,
    maxSpeedMs: 0,
    runs: 0,
    verticalDoneM: 0,
    mode: "up",
    top: null,
    low: null,
    track: [],
  };
}

export function distanceBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function stepRuns(state: TrackerState, alt: number): Pick<TrackerState, "mode" | "top" | "low" | "runs" | "verticalDoneM"> {
  let { mode, top, low, runs, verticalDoneM } = state;
  if (mode === "up") {
    top = top === null ? alt : Math.max(top, alt);
    if (top - alt >= RUN_ENTER_M) {
      mode = "down";
      low = alt;
    }
  } else {
    low = low === null ? alt : Math.min(low, alt);
    if (alt - low >= RUN_EXIT_M) {
      const drop = (top ?? low) - low;
      if (drop >= RUN_MIN_DROP_M) {
        runs += 1;
        verticalDoneM += drop;
      }
      mode = "up";
      top = alt;
      low = null;
    }
  }
  return { mode, top, low, runs, verticalDoneM };
}

export function addFix(state: TrackerState, fix: Fix): TrackerState {
  if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lng) || !(fix.accuracy <= MAX_ACCURACY_M)) return state;
  if (state.last && fix.t <= state.last.t) return state;

  const rawAlt = fix.alt !== null && Number.isFinite(fix.alt) ? fix.alt : null;
  const prevAlt = state.alt;
  const alt = rawAlt === null ? prevAlt : prevAlt === null ? rawAlt : prevAlt + ALT_SMOOTHING * (rawAlt - prevAlt);

  const point = { lat: fix.lat, lng: fix.lng, t: fix.t };
  const track = nextTrack(state.track, fix);
  const runState = alt === null ? {} : stepRuns(state, alt);

  if (!state.last) return { ...state, ...runState, last: point, alt, track };

  const dt = (fix.t - state.last.t) / 1000;
  const d = distanceBetween(state.last, fix);
  if (dt > GAP_S) return { ...state, ...runState, last: point, alt, track };

  const speed = d / dt;
  /* A jump no skier makes: drop the fix, keep the last good one. */
  if (speed > MAX_SPEED_MS) return state;

  const climb = alt !== null && prevAlt !== null ? (alt - prevAlt) / dt : 0;
  const onLift = climb > LIFT_CLIMB_MS;
  const reported = fix.speed !== null && Number.isFinite(fix.speed) && fix.speed >= 0 && fix.speed <= MAX_SPEED_MS ? fix.speed : null;
  /* Short intervals overstate speed from GPS jitter; trust them only with Doppler. */
  const segmentSpeed = reported ?? (dt >= 3 ? speed : 0);

  return {
    ...state,
    ...runState,
    last: point,
    alt,
    track,
    distanceM: onLift || speed < 1 ? state.distanceM : state.distanceM + d,
    maxSpeedMs: onLift ? state.maxSpeedMs : Math.max(state.maxSpeedMs, segmentSpeed),
  };
}

function nextTrack(track: [number, number][], fix: Fix): [number, number][] {
  const last = track.at(-1);
  if (last && distanceBetween({ lng: last[0], lat: last[1] }, fix) < TRACK_STEP_M) return track;
  const next: [number, number][] = [...track, [fix.lng, fix.lat]];
  /* Long days: keep every other point rather than dropping the start. */
  return next.length > TRACK_MAX_POINTS ? next.filter((_, i) => i % 2 === 0 || i === next.length - 1) : next;
}

/* Vertical skied so far, counting the run in progress. */
export function verticalSoFar(state: TrackerState): number {
  const current = state.mode === "down" && state.top !== null && state.low !== null ? state.top - state.low : 0;
  return state.verticalDoneM + current;
}

/* Runs so far, counting a run in progress that already dropped enough. */
export function runsSoFar(state: TrackerState): number {
  const current = state.mode === "down" && state.top !== null && state.low !== null && state.top - state.low >= RUN_MIN_DROP_M;
  return state.runs + (current ? 1 : 0);
}

export function summarize(state: TrackerState, now: number): SkiDaySummary {
  return {
    startedAt: new Date(state.startedAt).toISOString(),
    endedAt: new Date(Math.max(now, state.startedAt)).toISOString(),
    distanceM: Math.round(state.distanceM),
    verticalM: Math.round(verticalSoFar(state)),
    maxSpeedKmh: Math.round(state.maxSpeedMs * 3.6 * 10) / 10,
    runs: runsSoFar(state),
  };
}

/* Worth saving: at least a few minutes and some movement. */
export function isWorthSaving(summary: SkiDaySummary): boolean {
  const minutes = (Date.parse(summary.endedAt) - Date.parse(summary.startedAt)) / 60_000;
  return minutes >= 3 && (summary.distanceM >= 200 || summary.verticalM >= RUN_MIN_DROP_M);
}

/* The resort the day was at: the nearest within 15 km of the track's middle. */
export function nearestResort<T extends { name: string; coordinates: readonly [number, number] }>(
  track: readonly [number, number][],
  resorts: readonly T[],
): string | null {
  const middle = track[Math.floor(track.length / 2)];
  if (!middle) return null;
  const here = { lng: middle[0], lat: middle[1] };
  let best: { name: string; d: number } | null = null;
  for (const resort of resorts) {
    const d = distanceBetween(here, { lat: resort.coordinates[0], lng: resort.coordinates[1] });
    if (d <= 15_000 && (!best || d < best.d)) best = { name: resort.name, d };
  }
  return best?.name ?? null;
}

export function isTrackerState(value: unknown): value is TrackerState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<TrackerState>;
  return (
    typeof v.startedAt === "number" && typeof v.distanceM === "number" && typeof v.maxSpeedMs === "number" &&
    typeof v.runs === "number" && typeof v.verticalDoneM === "number" && (v.mode === "up" || v.mode === "down") &&
    Array.isArray(v.track)
  );
}
