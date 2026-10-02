import { describe, expect, it } from "vitest";
import type { ResortStatus } from "@/lib/types";
import { toLiveRide, type RideRow } from "@/features/rides/live-ride";
import { applyRideActivity, ridesAt } from "./resort-activity";

const NOW = new Date(2027, 0, 8, 9);

const resort = {
  name: "Nordkette",
  city: "innsbruck",
  ridersNow: 99,
  chillRiders: 50,
  parkRiders: 30,
  offPisteRiders: 19,
} as ResortStatus;

function ride(patch: Partial<RideRow>) {
  return toLiveRide(
    {
      id: "r",
      host_id: "h",
      host_display_name: "H",
      host_handle: "h_h",
      host_is_minor: false,
      resort: "Nordkette",
      city: "innsbruck",
      ability_level: "park",
      ride_date: "2027-01-08",
      meet_time: "09:00:00",
      meet_point: null,
      meet_point_locked: true,
      total_spots: 4,
      taken_spots: 2,
      caption: null,
      title: null,
      visibility: "friends",
      created_at: "2027-01-08T07:00:00Z",
      is_host: false,
      is_joined: false,
      participants: [],
      ...patch,
    },
    NOW,
  );
}

describe("applyRideActivity", () => {
  it("replaces invented counts with people on today's rides", () => {
    const rides = [
      ride({}),
      ride({ id: "r2", ability_level: "chill", taken_spots: 0 }),
      ride({ id: "r3", ride_date: "2027-01-09" }),
      ride({ id: "r4", resort: "Stubai Glacier" }),
      ride({ id: "r5", city: "salzburg" }),
    ];

    expect(applyRideActivity([resort], rides)[0]).toMatchObject({
      ridersNow: 4,
      parkRiders: 3,
      chillRiders: 1,
      offPisteRiders: 0,
    });
    expect(ridesAt(resort, rides).map((r) => r.post.id)).toEqual(["r", "r2"]);
  });

  it("shows zero without rides", () => {
    expect(applyRideActivity([resort], [])[0]?.ridersNow).toBe(0);
  });
});
