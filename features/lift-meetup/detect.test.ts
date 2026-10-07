import { describe, expect, it } from "vitest";
import type { Lift } from "@/lib/lifts";
import { detectLift } from "./detect";

const lift = (id: string, bottom: [number, number], top: [number, number]): Lift => ({
  id, resort: "Nordkette", name: id, bottomCoordinates: bottom, topCoordinates: top,
  durationMinutes: 8, durationSource: "osm", aerialwayType: "gondola", lengthMeters: 2000,
  osmWayId: 1, osmUpdatedAt: "2026-01-01T00:00:00Z",
});
const A = lift("A", [47.30, 11.38], [47.32, 11.38]);
const B = lift("B", [47.30, 11.40], [47.32, 11.40]);
const at = (lat: number, lng: number) => ({ lat, lng, accuracy: 10 });

describe("detectLift", () => {
  it("knows the lift you are sitting in", () => {
    expect(detectLift(at(47.31, 11.3801), [A, B])).toEqual({ lift: A, how: "riding" });
  });

  it("knows the valley station you stand at, or the nearest one", () => {
    expect(detectLift(at(47.3001, 11.4), [A, B])).toEqual({ lift: B, how: "at_bottom" });
    expect(detectLift(at(47.2975, 11.38), [A, B])).toEqual({ lift: A, how: "near" });
  });

  it("guesses nothing far away or without a position", () => {
    expect(detectLift(at(47.25, 11.38), [A, B])).toBeNull();
    expect(detectLift(null, [A, B])).toBeNull();
  });
});
