import { describe, expect, it } from "vitest";
import { deriveDurationMinutes, LIFTS, NOMINAL_LIFT_SPEED_METERS_PER_SECOND, type Lift } from "@/lib/lifts";
import { RESORTS } from "@/lib/resorts";
import { canSuggestFromPosition, estimateLiftArrival, estimateLiftWaitMinutes, suggestMeetingLift } from "./estimate";

const seegrube: Lift = {
  id: "osm-way-25170582",
  resort: "Nordkette",
  name: "Seegrubenbahn",
  bottomCoordinates: [47.2861686, 11.3990069],
  topCoordinates: [47.3063876, 11.3797446],
  durationMinutes: 5.33,
  durationSource: "osm",
  aerialwayType: "cable_car",
  lengthMeters: 2700,
  osmWayId: 25170582,
  osmUpdatedAt: "2026-02-18T17:18:15Z",
};

describe("lift wait estimate", () => {
  it("uses a transparent time-of-day baseline and weekend/holiday/snow uplifts", () => {
    const weekday = new Date("2026-10-06T09:00:00+02:00");
    const weekend = new Date("2026-10-10T09:00:00+02:00");
    expect(estimateLiftWaitMinutes({ at: weekday })).toBe(4);
    expect(estimateLiftWaitMinutes({ at: weekend })).toBe(10);
    expect(estimateLiftWaitMinutes({ at: weekday, isSchoolHoliday: true, newSnowCm: 25 })).toBe(14);
  });

  it("does not infer current crowds from missing conditions and rejects invalid snowfall", () => {
    const at = new Date("2026-10-06T15:00:00+02:00");
    expect(estimateLiftWaitMinutes({ at })).toBe(1);
    expect(estimateLiftWaitMinutes({ at, newSnowCm: -1 })).toBe(1);
    expect(estimateLiftWaitMinutes({ at, newSnowCm: Number.NaN })).toBe(1);
  });

  it("adds the lift ride to the estimated wait", () => {
    const at = new Date("2026-10-06T09:00:00+02:00");
    expect(estimateLiftArrival(seegrube, at).toISOString()).toBe("2026-10-06T07:09:19.800Z");
  });
});

describe("OSM lift reference", () => {
  it("has identified OSM lifts for every covered resort and unique way IDs", () => {
    expect(new Set(LIFTS.map((lift) => lift.resort))).toEqual(new Set(RESORTS.map((resort) => resort.name)));
    expect(new Set(LIFTS.map((lift) => lift.osmWayId)).size).toBe(LIFTS.length);
    expect(LIFTS.every((lift) => lift.id === `osm-way-${lift.osmWayId}` && lift.lengthMeters > 0)).toBe(true);
  });

  it("derives missing ride durations from mapped geometry and documented nominal speed", () => {
    expect(deriveDurationMinutes(1200, "gondola")).toBe(4);
    for (const lift of LIFTS.filter((item) => item.durationSource === "derived")) {
      expect(lift.assumedSpeedMetersPerSecond).toBe(NOMINAL_LIFT_SPEED_METERS_PER_SECOND[lift.aerialwayType]);
      expect(lift.durationMinutes).toBe(deriveDurationMinutes(lift.lengthMeters, lift.aerialwayType));
    }
  });
});

describe("on-device lift suggestion", () => {
  it("requires a sufficiently accurate device fix", () => {
    expect(canSuggestFromPosition(20)).toBe(true);
    expect(canSuggestFromPosition(250)).toBe(false);
    expect(canSuggestFromPosition(null)).toBe(false);
    expect(canSuggestFromPosition(-1)).toBe(false);
  });
  it("chooses a nearby bottom station with a top near the target", () => {
    const at = new Date("2026-10-06T09:00:00+02:00");
    const result = suggestMeetingLift([seegrube], seegrube.topCoordinates, seegrube.bottomCoordinates, at);
    expect(result?.lift.id).toBe(seegrube.id);
    expect(result?.distanceToBottomMeters).toBe(0);
    expect(result?.distanceFromTopMeters).toBe(0);
    expect(result?.arrivalAt.toISOString()).toBe("2026-10-06T07:09:19.800Z");
  });

  it("does not suggest a lift with a distant top station", () => {
    const at = new Date("2026-10-06T09:00:00+02:00");
    expect(suggestMeetingLift([seegrube], [47.32, 11.41], seegrube.bottomCoordinates, at)).toBeUndefined();
  });

  it("does not offer an implausibly long straight-line approach", () => {
    const at = new Date("2026-10-06T09:00:00+02:00");
    expect(suggestMeetingLift([seegrube], seegrube.topCoordinates, [47.25, 11.4], at)).toBeUndefined();
  });
});
