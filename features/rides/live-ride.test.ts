import { describe, expect, it } from "vitest";
import {
  LOCKED_MEET_POINT_LABEL,
  formatPostedAt,
  formatRideDate,
  profileToUser,
  toLiveRide,
  type RideRow,
} from "./live-ride";

const NOW = new Date(Date.UTC(2027, 0, 8, 11, 0, 0));

const row: RideRow = {
  id: "ride-1",
  host_id: "host-1",
  host_display_name: "Lena Moser",
  host_handle: "lena_m",
  host_is_minor: false,
  resort: "Stubai Glacier",
  city: "innsbruck",
  ability_level: "off-piste",
  ride_date: "2027-01-08",
  meet_time: "08:30:00",
  meet_point: null,
  meet_point_locked: true,
  total_spots: 4,
  taken_spots: 2,
  caption: null,
  title: null,
  visibility: "friends",
  created_at: new Date(Date.UTC(2027, 0, 8, 10, 37)).toISOString(),
  is_host: false,
  is_joined: false,
  participants: [],
};

describe("toLiveRide", () => {
  it("maps a locked row without inventing the meeting point", () => {
    const ride = toLiveRide(row, NOW);

    expect(ride.post).toMatchObject({
      id: "ride-1",
      authorId: "host-1",
      date: "Today",
      meetTime: "08:30",
      meetPoint: LOCKED_MEET_POINT_LABEL,
      caption: "",
      postedAt: "23 min ago",
      takenSpots: 2,
      joinedUserIds: [],
    });
    expect(ride.post).not.toHaveProperty("title");
    expect(ride.meetPointLocked).toBe(true);
    expect(ride.host).toMatchObject({ name: "Lena Moser", handle: "lena_m", avatar: "LM", isMinor: false });
  });

  it("keeps the meeting point, title and participants when delivered", () => {
    const ride = toLiveRide(
      {
        ...row,
        meet_point: "Parking P2",
        meet_point_locked: false,
        title: "Powder morning",
        visibility: "public",
        caption: "Early",
        is_joined: true,
        participants: [{ id: "u2", display_name: null, handle: "max_r" }],
      },
      NOW,
    );

    expect(ride.post.meetPoint).toBe("Parking P2");
    expect(ride.post.title).toBe("Powder morning");
    expect(ride.post.joinedUserIds).toEqual(["u2"]);
    expect(ride.participants[0]).toMatchObject({ name: "max_r", avatar: "MA" });
    expect(ride.isJoined).toBe(true);
  });
});

describe("profileToUser", () => {
  it("defaults to the safe values", () => {
    expect(profileToUser({ id: "x", display_name: null, handle: null })).toMatchObject({
      name: "Rider",
      handle: "",
      isMinor: true,
      city: "innsbruck",
      badges: [],
    });
  });
});

describe("formatRideDate", () => {
  it.each([
    ["2027-01-08", "Today"],
    ["2027-01-09", "Tomorrow"],
    ["2027-01-12", "Tue 12 Jan"],
  ])("%s → %s", (input, expected) => {
    expect(formatRideDate(input, NOW)).toBe(expected);
  });

  it("crosses a month boundary for tomorrow", () => {
    expect(formatRideDate("2027-02-01", new Date(Date.UTC(2027, 0, 31, 9)))).toBe("Tomorrow");
  });

  it("follows Vienna midnight, not the server's UTC day", () => {
    /* 23:30 UTC on 8 Jan is already 00:30 on 9 Jan in Vienna */
    const lateUtc = new Date(Date.UTC(2027, 0, 8, 23, 30));
    expect(formatRideDate("2027-01-09", lateUtc)).toBe("Today");
    expect(formatRideDate("2027-01-10", lateUtc)).toBe("Tomorrow");
  });
});

describe("formatPostedAt", () => {
  const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

  it.each([
    [0, "just now"],
    [-5, "just now"],
    [5, "5 min ago"],
    [125, "2 hr ago"],
    [60 * 30, "yesterday"],
    [60 * 24 * 3, "3 days ago"],
  ])("%i minutes → %s", (minutes, expected) => {
    expect(formatPostedAt(ago(minutes), NOW)).toBe(expected);
  });
});
