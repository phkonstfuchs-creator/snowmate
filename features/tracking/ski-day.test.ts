import { describe, expect, it } from "vitest";
import { formatDuration, formatKm, isPlausibleSummary, seasonStart, seasonTotals, toSkiDay, type SkiDay } from "./ski-day";

const NOW = Date.UTC(2026, 0, 10, 16);
const good = {
  startedAt: new Date(NOW - 6 * 3600_000).toISOString(),
  endedAt: new Date(NOW - 3600_000).toISOString(),
  distanceM: 42_000,
  verticalM: 5200,
  maxSpeedKmh: 87.4,
  runs: 14,
};

describe("isPlausibleSummary", () => {
  it("accepts a real day", () => {
    expect(isPlausibleSummary(good, NOW)).toBe(true);
  });

  it("refuses what no skier reaches and malformed input", () => {
    expect(isPlausibleSummary({ ...good, maxSpeedKmh: 151 }, NOW)).toBe(false);
    expect(isPlausibleSummary({ ...good, distanceM: 300_000 }, NOW)).toBe(false);
    expect(isPlausibleSummary({ ...good, verticalM: 1.5 }, NOW)).toBe(false);
    expect(isPlausibleSummary({ ...good, runs: -1 }, NOW)).toBe(false);
    expect(isPlausibleSummary({ ...good, startedAt: new Date(NOW - 20 * 3600_000).toISOString() }, NOW)).toBe(false);
    expect(isPlausibleSummary({ ...good, endedAt: good.startedAt }, NOW)).toBe(false);
    expect(isPlausibleSummary({ ...good, startedAt: "yesterday" }, NOW)).toBe(false);
    expect(isPlausibleSummary(null, NOW)).toBe(false);
  });
});

describe("season", () => {
  it("runs from September to August", () => {
    expect(seasonStart(new Date(Date.UTC(2026, 0, 10))).toISOString()).toBe("2025-09-01T00:00:00.000Z");
    expect(seasonStart(new Date(Date.UTC(2026, 9, 6))).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("adds up this season's days only", () => {
    const day = (startedAt: string, extra: Partial<SkiDay> = {}): SkiDay => ({ ...good, id: startedAt, resort: null, startedAt, ...extra });
    const totals = seasonTotals(
      [day("2026-01-09T08:00:00Z"), day("2025-12-20T08:00:00Z", { maxSpeedKmh: 95.2 }), day("2025-03-01T08:00:00Z", { maxSpeedKmh: 120 })],
      new Date(NOW),
    );
    expect(totals).toEqual({ days: 2, distanceM: 84_000, verticalM: 10_400, runs: 28, maxSpeedKmh: 95.2 });
  });
});

describe("formatting and rows", () => {
  it("formats kilometres and durations", () => {
    expect(formatKm(4250, "de-AT")).toBe("4,3");
    expect(formatKm(42_400, "en-GB")).toBe("42");
    expect(formatDuration(3 * 3600_000 + 7 * 60_000)).toBe("3:07");
  });

  it("reads numeric speed from the database", () => {
    expect(toSkiDay({ id: "a", resort: null, started_at: good.startedAt, ended_at: good.endedAt, distance_m: 1, vertical_m: 2, max_speed_kmh: "87.5", runs: 3 }).maxSpeedKmh).toBe(87.5);
  });
});
