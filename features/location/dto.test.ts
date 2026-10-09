import { describe, expect, it } from "vitest";
import { parseLiveLocationRows, parseResortPresenceRows } from "./dto";

const presenceRow = {
  user_id: "10000000-0000-4000-8000-000000000001",
  display_name: "Alex Berg",
  handle: "alex_berg",
  avatar_path: null,
  resort_id: "stubai-glacier",
  resort_name: "Stubaier Gletscher",
  city: "innsbruck",
  last_seen_at: "2026-08-03T10:00:00+00:00",
  relationship: "friend-of-friend",
};

describe("location DTO parsing", () => {
  it("keeps broad resort presence free of exact coordinates", () => {
    expect(parseResortPresenceRows([presenceRow])?.[0]).toEqual(
      expect.objectContaining({
        userId: presenceRow.user_id,
        resort: { id: "stubai-glacier", name: "Stubaier Gletscher" },
      }),
    );
    expect(
      parseResortPresenceRows([{ ...presenceRow, latitude: 47.01 }]),
    ).toBeNull();
  });

  it("accepts exact coordinates only in the live-location DTO", () => {
    const row = {
      session_id: "20000000-0000-4000-8000-000000000001",
      user_id: presenceRow.user_id,
      display_name: presenceRow.display_name,
      handle: presenceRow.handle,
      avatar_path: null,
      resort_id: presenceRow.resort_id,
      ride_id: "30000000-0000-4000-8000-000000000001",
      latitude: 47.011,
      longitude: 11.302,
      accuracy_meters: 18,
      observed_at: "2026-08-03T10:00:00+00:00",
    };

    expect(parseLiveLocationRows([row])?.[0]).toEqual(
      expect.objectContaining({
        sessionId: row.session_id,
        coordinates: {
          latitude: 47.011,
          longitude: 11.302,
          accuracyMeters: 18,
        },
      }),
    );
    expect(parseLiveLocationRows([{ ...row, email: "x@y.de" }])).toBeNull();
  });
});
