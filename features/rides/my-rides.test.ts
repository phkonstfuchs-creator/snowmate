import { describe, expect, it } from "vitest";
import type { LiveRide } from "./live-ride";
import { splitMyRides } from "./my-rides";

const ride = (id: string, rideDate: string, flags: Partial<Pick<LiveRide, "isHost" | "isJoined">>) =>
  ({ post: { id }, rideDate, isHost: false, isJoined: false, ...flags }) as unknown as LiveRide;

describe("my rides", () => {
  it("keeps hosted and joined rides, upcoming soonest first, past latest first", () => {
    const { upcoming, past } = splitMyRides(
      [
        ride("later", "2027-01-20", { isHost: true }),
        ride("today", "2027-01-08", { isJoined: true }),
        ride("other", "2027-01-09", {}),
        ride("old", "2026-12-01", { isJoined: true }),
        ride("recent", "2027-01-02", { isHost: true }),
      ],
      "2027-01-08",
    );
    expect(upcoming.map((r) => r.post.id)).toEqual(["today", "later"]);
    expect(past.map((r) => r.post.id)).toEqual(["recent", "old"]);
  });

  it("limits the past", () => {
    const many = Array.from({ length: 8 }, (_, i) => ride(`p${i}`, `2026-12-0${i + 1}`, { isHost: true }));
    expect(splitMyRides(many, "2027-01-01").past).toHaveLength(5);
  });
});
