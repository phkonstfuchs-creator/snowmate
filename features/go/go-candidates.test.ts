import { describe, expect, it } from "vitest";
import { goCandidates } from "./go-candidates";
import { toLiveRide, type RideRow } from "@/features/rides/live-ride";
const now = new Date("2026-10-09T08:00:00Z");
const row: RideRow = { id: "r", host_id: "h", host_display_name: "Rider", host_handle: "rider", host_is_minor: false, resort: "Nordkette", city: "innsbruck", ability_level: "park", ride_date: "2026-10-09", meet_time: "11:00:00", meet_point: null, meet_point_locked: true, total_spots: 3, taken_spots: 0, caption: null, title: null, visibility: "friends", created_at: now.toISOString(), is_host: false, is_joined: false, participants: [] };
describe("Go chooser candidates", () => {
  it("uses the Vienna start time and rejects started, full, host, joined and pending rides", () => {
    const eligible = toLiveRide(row, now);
    expect(goCandidates([eligible], now)).toEqual([eligible]);
    expect(goCandidates([
      toLiveRide({ ...row, meet_time: "09:59:00" }, now),
      toLiveRide({ ...row, is_host: true }, now),
      toLiveRide({ ...row, is_joined: true }, now),
      toLiveRide({ ...row, my_status: "pending" }, now),
      toLiveRide({ ...row, taken_spots: 3 }, now),
      { ...eligible, rideDate: undefined },
      { ...eligible, rideDate: "invalid" },
    ], now)).toEqual([]);
  });
  it("sorts future rides by start without mutating the supplied list", () => {
    const late = toLiveRide({ ...row, id: "late", ride_date: "2026-10-10" }, now);
    const early = toLiveRide(row, now);
    const input = Object.freeze([late, early]);
    expect(goCandidates(input, now).map((ride) => ride.post.id)).toEqual(["r", "late"]);
    expect(input[0]).toBe(late);
  });
});
