import { describe, expect, it } from "vitest";
import type { LiveRide } from "@/features/rides/live-ride";
import { computeAccountStats } from "./account-stats";

const ride = (resort: string, isHost: boolean, isJoined: boolean) =>
  ({ post: { resort }, isHost, isJoined }) as LiveRide;

describe("computeAccountStats", () => {
  it("counts own rides, their resorts and friends", () => {
    expect(
      computeAccountStats(
        [ride("Nordkette", true, false), ride("Nordkette", false, true), ride("Stubai", false, true), ride("Kühtai", false, false)],
        { friends: [{}, {}] as never, incoming: [], outgoing: [] },
      ),
    ).toEqual({ rides: 3, resorts: 2, crew: 2 });
  });

  it("degrades per source and returns null when both fail", () => {
    expect(computeAccountStats(null, { friends: [], incoming: [], outgoing: [] })).toEqual({ rides: 0, resorts: 0, crew: 0 });
    expect(computeAccountStats([], null)).toEqual({ rides: 0, resorts: 0, crew: 0 });
    expect(computeAccountStats(null, null)).toBeNull();
  });
});
