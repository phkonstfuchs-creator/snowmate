import { describe, expect, it } from "vitest";
import type { SkiDay } from "@/features/tracking/ski-day";
import { BADGES, earnedBadges } from "./badges";

const day = (extra: Partial<SkiDay> = {}): SkiDay => ({
  id: Math.random().toString(),
  resort: "Nordkette",
  startedAt: "2026-01-10T10:00:00Z", // 11:00 in Vienna
  endedAt: "2026-01-10T15:00:00Z",
  distanceM: 20_000,
  verticalM: 3000,
  maxSpeedKmh: 60,
  runs: 10,
  ...extra,
});

describe("earnedBadges", () => {
  it("earns nothing without activity", () => {
    expect(earnedBadges({ days: [], ridesHosted: 0, ridesJoined: 0, friends: 0 }).size).toBe(0);
  });

  it("earns stamps from tracked days", () => {
    const earned = earnedBadges({
      days: [
        day({ startedAt: "2026-01-11T07:30:00Z" }), // 8:30 in Vienna
        day({ resort: "Stubai Glacier", runs: 22, maxSpeedKmh: 84 }),
        day({ resort: "Axamer Lizum" }),
        day(),
      ],
      ridesHosted: 0,
      ridesJoined: 0,
      friends: 0,
    });
    expect([...earned].sort()).toEqual(["early_bird", "first_day", "runs_20", "speed_80", "three_resorts", "vertical_10k"]);
  });

  it("earns the big ones and the crew ones", () => {
    const days = Array.from({ length: 12 }, () => day({ verticalM: 5000, distanceM: 10_000, maxSpeedKmh: 101 }));
    const earned = earnedBadges({ days, ridesHosted: 3, ridesJoined: 1, friends: 2 });
    for (const id of ["vertical_50k", "km_100", "days_10", "speed_100", "host", "crew_rider"]) expect(earned.has(id as never)).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(BADGES.length);
  });
});
