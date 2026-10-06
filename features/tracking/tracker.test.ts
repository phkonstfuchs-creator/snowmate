import { describe, expect, it } from "vitest";
import { addFix, distanceBetween, isWorthSaving, nearestResort, runsSoFar, startTracker, summarize, verticalSoFar, type Fix, type TrackerState } from "./tracker";

const BASE = { lat: 47.3, lng: 11.39 };
const T0 = Date.UTC(2026, 0, 10, 8);
const M_PER_DEG_LAT = 111_195;

/* Moves north/south along a meridian: metres → degrees. */
function leg(from: { north: number; alt: number; t: number }, to: { north: number; alt: number }, seconds: number, every = 2): Fix[] {
  const fixes: Fix[] = [];
  const steps = Math.round(seconds / every);
  const speed = Math.abs(to.north - from.north) / seconds;
  for (let i = 1; i <= steps; i += 1) {
    const f = i / steps;
    fixes.push({
      lat: BASE.lat + (from.north + (to.north - from.north) * f) / M_PER_DEG_LAT,
      lng: BASE.lng,
      alt: from.alt + (to.alt - from.alt) * f,
      accuracy: 8,
      speed,
      t: from.t + i * every * 1000,
    });
  }
  return fixes;
}

function feed(state: TrackerState, fixes: Fix[]) {
  return fixes.reduce(addFix, state);
}

/* One lap: wait, lift up 500 m (1000 m north, 6 min), wait, ski down
   (2000 m south, ~2 min 13 s at 15 m/s). */
function lap(start: number, north: number): { fixes: Fix[]; end: number; north: number } {
  const fixes: Fix[] = [];
  let t = start;
  const push = (next: Fix[]) => {
    fixes.push(...next);
    t = next.at(-1)!.t;
  };
  push(leg({ north, alt: 1000, t }, { north, alt: 1000 }, 30));
  push(leg({ north, alt: 1000, t }, { north: north + 1000, alt: 1500 }, 360));
  push(leg({ north: north + 1000, alt: 1500, t }, { north: north + 1000, alt: 1500 }, 30));
  push(leg({ north: north + 1000, alt: 1500, t }, { north: north - 1000, alt: 1000 }, 2000 / 15));
  return { fixes, end: t, north: north - 1000 };
}

describe("ski-day tracker", () => {
  it("counts runs, vertical, ski distance and top speed, not the lift", () => {
    let state = feed(startTracker(T0), [{ lat: BASE.lat, lng: BASE.lng, alt: 1000, accuracy: 8, speed: 0, t: T0 }]);
    let t = T0;
    let north = 0;
    for (let i = 0; i < 3; i += 1) {
      const next = lap(t, north);
      state = feed(state, next.fixes);
      t = next.end;
      north = next.north;
    }
    state = feed(state, leg({ north, alt: 1000, t }, { north, alt: 1000 }, 60));

    const summary = summarize(state, t + 60_000);
    expect(summary.runs).toBe(3);
    expect(summary.verticalM).toBeGreaterThan(1400);
    expect(summary.verticalM).toBeLessThanOrEqual(1500);
    expect(summary.distanceM).toBeGreaterThan(5800);
    expect(summary.distanceM).toBeLessThan(6200);
    expect(summary.maxSpeedKmh).toBeCloseTo(54, 0);
    expect(isWorthSaving(summary)).toBe(true);
  });

  it("counts the run still in progress", () => {
    let state = startTracker(T0);
    state = feed(state, leg({ north: 0, alt: 1500, t: T0 }, { north: 0, alt: 1500 }, 20));
    state = feed(state, leg({ north: 0, alt: 1500, t: T0 + 20_000 }, { north: -1000, alt: 1200 }, 80));
    expect(runsSoFar(state)).toBe(1);
    expect(verticalSoFar(state)).toBeGreaterThan(250);
  });

  it("skips inaccurate fixes and impossible jumps", () => {
    let state = feed(startTracker(T0), [{ lat: BASE.lat, lng: BASE.lng, alt: 1000, accuracy: 5, speed: null, t: T0 }]);
    state = addFix(state, { lat: BASE.lat + 0.001, lng: BASE.lng, alt: 1000, accuracy: 80, speed: null, t: T0 + 5000 });
    state = addFix(state, { lat: BASE.lat + 0.05, lng: BASE.lng, alt: 1000, accuracy: 5, speed: null, t: T0 + 10_000 });
    expect(state.distanceM).toBe(0);
    expect(state.maxSpeedMs).toBe(0);
    state = addFix(state, { lat: BASE.lat + 0.0005, lng: BASE.lng, alt: 1000, accuracy: 5, speed: null, t: T0 + 15_000 });
    expect(state.distanceM).toBeCloseTo(55.6, 0);
  });

  it("bridges a long gap without distance", () => {
    let state = feed(startTracker(T0), [{ lat: BASE.lat, lng: BASE.lng, alt: null, accuracy: 5, speed: null, t: T0 }]);
    state = addFix(state, { lat: BASE.lat + 0.02, lng: BASE.lng, alt: null, accuracy: 5, speed: null, t: T0 + 10 * 60_000 });
    expect(state.distanceM).toBe(0);
    expect(state.last?.t).toBe(T0 + 10 * 60_000);
  });

  it("works without altitude: distance and speed only", () => {
    const fixes = leg({ north: 0, alt: 0, t: T0 }, { north: 600, alt: 0 }, 60).map((fix) => ({ ...fix, alt: null }));
    const state = feed(startTracker(T0), fixes);
    const summary = summarize(state, T0 + 5 * 60_000);
    expect(summary).toMatchObject({ runs: 0, verticalM: 0 });
    expect(summary.distanceM).toBeGreaterThan(550);
    expect(summary.maxSpeedKmh).toBeCloseTo(36, 0);
  });

  it("only offers to save a real day", () => {
    const short = summarize(startTracker(T0), T0 + 60_000);
    expect(isWorthSaving(short)).toBe(false);
  });
});

describe("nearestResort", () => {
  const resorts = [
    { name: "Nordkette", coordinates: [47.3247, 11.3867] as const },
    { name: "Axamer Lizum", coordinates: [47.1955, 11.3015] as const },
  ];
  it("picks the nearest resort within 15 km, or none", () => {
    expect(nearestResort([[11.39, 47.31]], resorts)).toBe("Nordkette");
    expect(nearestResort([[13.0, 47.8]], resorts)).toBeNull();
    expect(nearestResort([], resorts)).toBeNull();
  });
  it("measures distance on the sphere", () => {
    expect(distanceBetween({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(M_PER_DEG_LAT, -2);
  });
});
