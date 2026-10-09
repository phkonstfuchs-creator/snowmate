import { describe, expect, it } from "vitest";
import {
  parseCarpoolMemberRows,
  parseCarpoolRequestRows,
  parseCarpoolFeedRows,
  parseRideMemberRows,
  parseRideRequestRows,
  parseRideDetailRow,
  parseRideFeedRows,
} from "./dto";

const rideFeedRow = {
  id: "10000000-0000-4000-8000-000000000001",
  host_id: "10000000-0000-4000-8000-000000000002",
  host_display_name: "Alex Berg",
  host_handle: "alex_berg",
  host_avatar_path: null,
  resort_id: "stubai-glacier",
  resort_name: "Stubaier Gletscher",
  city: "innsbruck",
  ability_level: "chill",
  starts_at: "2026-08-04T08:00:00+00:00",
  capacity: 4,
  taken_spots: 1,
  audience: "friends-of-friends",
  caption: "Erste Gondel",
  status: "scheduled",
  created_at: "2026-08-03T08:00:00+00:00",
};

describe("ride DTO parsing", () => {
  it("maps the broad feed without exact meeting data", () => {
    expect(parseRideFeedRows([rideFeedRow])).toEqual([
      expect.objectContaining({
        id: rideFeedRow.id,
        host: {
          id: rideFeedRow.host_id,
          displayName: "Alex Berg",
          handle: "alex_berg",
          avatarPath: null,
        },
        resort: { id: "stubai-glacier", name: "Stubaier Gletscher" },
        takenSpots: 1,
      }),
    ]);
  });

  it("fails closed if a broad feed unexpectedly contains a meeting point", () => {
    expect(
      parseRideFeedRows([{ ...rideFeedRow, meeting_point: "Private Kassa" }]),
    ).toBeNull();
  });

  it("maps an authorized detail while preserving a hidden null state", () => {
    expect(
      parseRideDetailRow({
        ...rideFeedRow,
        meeting_point: null,
        can_view_exact: false,
      }),
    ).toEqual(
      expect.objectContaining({ meetingPoint: null, canViewExact: false }),
    );
  });
});

describe("carpool DTO parsing", () => {
  it("rejects exact departure data in a broad carpool feed", () => {
    const row = {
      id: "20000000-0000-4000-8000-000000000001",
      host_id: "20000000-0000-4000-8000-000000000002",
      host_display_name: "Sam Schnee",
      host_handle: "sam_schnee",
      host_avatar_path: null,
      resort_id: "stubai-glacier",
      resort_name: "Stubaier Gletscher",
      city: "innsbruck",
      role: "driver",
      departs_at: "2026-08-04T06:30:00+00:00",
      seat_capacity: 3,
      available_seats: 2,
      audience: "friends",
      note: "Skisack passt",
      status: "scheduled",
      created_at: "2026-08-03T08:00:00+00:00",
    };

    expect(parseCarpoolFeedRows([row])).not.toBeNull();
    expect(
      parseCarpoolFeedRows([
        { ...row, departure_point: "Innsbruck Hauptbahnhof" },
      ]),
    ).toBeNull();
  });
});

describe("coordination roster DTO parsing", () => {
  const profile = {
    user_id: "30000000-0000-4000-8000-000000000001",
    display_name: "Mira Berg",
    handle: "mira_berg",
    avatar_path: null,
  };

  it("maps ride and carpool members without exposing profile internals", () => {
    expect(
      parseRideMemberRows([
        {
          ride_id: rideFeedRow.id,
          ...profile,
          role: "participant",
          joined_at: "2026-08-03T09:00:00+00:00",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        rideId: rideFeedRow.id,
        role: "participant",
        profile: expect.objectContaining({ id: profile.user_id }),
      }),
    ]);

    expect(
      parseCarpoolMemberRows([
        {
          carpool_id: "40000000-0000-4000-8000-000000000001",
          ...profile,
          joined_at: "2026-08-03T09:00:00+00:00",
        },
      ]),
    ).not.toBeNull();
  });

  it("maps request state and rejects unexpected private fields", () => {
    const request = {
      id: "50000000-0000-4000-8000-000000000001",
      requester_id: profile.user_id,
      requester_display_name: profile.display_name,
      requester_handle: profile.handle,
      requester_avatar_path: profile.avatar_path,
      status: "pending",
      created_at: "2026-08-03T09:00:00+00:00",
      responded_at: null,
    };

    expect(
      parseRideRequestRows([{ ride_id: rideFeedRow.id, ...request }]),
    ).toEqual([
      expect.objectContaining({
        id: request.id,
        status: "pending",
        requester: expect.objectContaining({ id: profile.user_id }),
      }),
    ]);
    expect(
      parseCarpoolRequestRows([
        {
          carpool_id: "40000000-0000-4000-8000-000000000001",
          ...request,
          internal_note: "must not cross the DTO boundary",
        },
      ]),
    ).toBeNull();
  });
});
