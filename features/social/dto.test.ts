import { describe, expect, it } from "vitest";
import {
  parseCrewInvitationRows,
  parseCrewMemberRows,
  parseCrewRows,
  parseDiscoveryProfileRows,
  parseFriendshipRows,
} from "./dto";

const user = {
  id: "10000000-0000-4000-8000-000000000001",
  display_name: "Alex Berg",
  handle: "alex_berg",
  city: "innsbruck",
  ability_level: "chill",
  avatar_path: null,
};

describe("social DTO parsing", () => {
  it("keeps discovery free of private age and contact fields", () => {
    const row = { ...user, relationship: "friend-of-friend" };

    expect(parseDiscoveryProfileRows([row])?.[0]).toEqual(
      expect.objectContaining({ id: user.id, relationship: "friend-of-friend" }),
    );
    expect(
      parseDiscoveryProfileRows([{ ...row, birth_date: "2000-01-01" }]),
    ).toBeNull();
  });

  it("maps friendship direction and rejects unexpected identity fields", () => {
    const row = {
      friendship_id: "20000000-0000-4000-8000-000000000001",
      other_user_id: user.id,
      display_name: user.display_name,
      handle: user.handle,
      city: user.city,
      ability_level: user.ability_level,
      avatar_path: null,
      status: "pending",
      direction: "incoming",
      created_at: "2026-08-03T10:00:00+00:00",
      responded_at: null,
    };

    expect(parseFriendshipRows([row])?.[0]).toEqual(
      expect.objectContaining({
        friendshipId: row.friendship_id,
        direction: "incoming",
      }),
    );
    expect(parseFriendshipRows([{ ...row, email: "x@y.de" }])).toBeNull();
  });

  it("maps crew summaries, rosters, and invitations", () => {
    const crewId = "30000000-0000-4000-8000-000000000001";
    expect(
      parseCrewRows([
        {
          id: crewId,
          name: "Weekend Crew",
          city: "innsbruck",
          own_role: "member",
          member_count: 2,
          created_at: "2026-08-03T10:00:00+00:00",
        },
      ])?.[0],
    ).toEqual(expect.objectContaining({ id: crewId, memberCount: 2 }));
    expect(
      parseCrewMemberRows([
        {
          user_id: user.id,
          display_name: user.display_name,
          handle: user.handle,
          avatar_path: null,
          role: "owner",
          joined_at: "2026-08-03T10:00:00+00:00",
        },
      ])?.[0],
    ).toEqual(expect.objectContaining({ userId: user.id, role: "owner" }));
    expect(
      parseCrewInvitationRows([
        {
          invitation_id: "40000000-0000-4000-8000-000000000001",
          crew_id: crewId,
          crew_name: "Weekend Crew",
          invited_by_user_id: user.id,
          invited_by_display_name: user.display_name,
          status: "pending",
          created_at: "2026-08-03T10:00:00+00:00",
        },
      ])?.[0],
    ).toEqual(expect.objectContaining({ crewName: "Weekend Crew" }));
  });
});
