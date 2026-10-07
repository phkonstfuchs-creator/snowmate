import { describe, expect, it } from "vitest";
import type { Lift } from "@/lib/lifts";
import { alongLift, friendWhereabouts, whereabouts } from "./whereabouts";

/* A straight 10-minute lift going north from the Nordkette area. */
const LIFT: Lift = {
  id: "test", resort: "Nordkette", name: "Testbahn",
  bottomCoordinates: [47.30, 11.38], topCoordinates: [47.32, 11.38],
  durationMinutes: 10, durationSource: "osm", aerialwayType: "gondola",
  lengthMeters: 2226, osmWayId: 1, osmUpdatedAt: "2026-01-01T00:00:00Z",
};
const at = (lat: number, lng = 11.38) => ({ lat, lng, accuracy: 10 });

describe("alongLift", () => {
  it("measures progress and sideways distance", () => {
    expect(alongLift(at(47.31), LIFT).t).toBeCloseTo(0.5, 2);
    expect(alongLift(at(47.31, 11.3805), LIFT).offsetM).toBeCloseTo(38, 0);
  });
});

describe("whereabouts", () => {
  it("estimates the time to the top for a friend on the lift", () => {
    expect(whereabouts(at(47.304), 0, [LIFT])).toMatchObject({ kind: "lift", minutesToTop: 8 });
    expect(whereabouts(at(47.315), 2, [LIFT])).toMatchObject({ kind: "lift", minutesToTop: 1 });
  });

  it("assumes the top once the ride should be over", () => {
    expect(whereabouts(at(47.315), 6, [LIFT])).toMatchObject({ kind: "top" });
  });

  it("recognises the stations", () => {
    expect(whereabouts(at(47.3002), 0, [LIFT])).toMatchObject({ kind: "bottom" });
    expect(whereabouts(at(47.3198), 0, [LIFT])).toMatchObject({ kind: "top" });
  });

  it("falls back to the resort, or away", () => {
    expect(whereabouts(at(47.31, 11.39), 0, [LIFT])).toEqual({ kind: "resort", resort: "Nordkette" });
    expect(whereabouts({ lat: 48.2, lng: 16.37, accuracy: 10 }, 0, [LIFT])).toEqual({ kind: "away" });
  });
});

describe("friendWhereabouts", () => {
  it("drops the lift estimate for an old position", () => {
    const now = Date.parse("2026-01-10T10:30:00Z");
    const friend = { userId: "u", name: "Lena", handle: "lena", lat: 47.305, lng: 11.38, accuracy: 10, updatedAt: "2026-01-10T10:00:00Z" };
    const result = friendWhereabouts(friend, now);
    expect(result.stale).toBe(true);
    expect(result.ageMinutes).toBe(30);
    expect(result.where).toEqual({ kind: "resort", resort: "Nordkette" });
    /* Not "at the top" either, even though the ride would be over. */
    const atStation = { ...friend, lat: 47.3198 };
    expect(friendWhereabouts(atStation, now).where.kind).toBe("resort");
    expect(friendWhereabouts({ ...friend, updatedAt: "2026-01-10T10:29:00Z" }, now).stale).toBe(false);
  });
});
