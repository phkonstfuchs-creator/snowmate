import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBlockedProfiles,
  getCrewInvitations,
  getCrewMembers,
  getCrews,
  getDiscoveryProfiles,
  getFriendships,
} from "./data";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const rpc = vi.fn();
const profileRow = {
  id: "10000000-0000-4000-8000-000000000001",
  display_name: "Alex Berg",
  handle: "alex_berg",
  city: "innsbruck",
  ability_level: "chill",
  avatar_path: null,
  relationship: "friend",
};

describe("social data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("loads discovery through its strict DTO RPC", async () => {
    rpc.mockResolvedValue({ data: [profileRow], error: null });

    await expect(getDiscoveryProfiles()).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ id: profileRow.id })],
    });
    expect(rpc).toHaveBeenCalledWith("get_discovery_profiles");
  });

  it("fails closed when friendship DTOs contain extra fields", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          friendship_id: "20000000-0000-4000-8000-000000000001",
          other_user_id: profileRow.id,
          display_name: profileRow.display_name,
          handle: profileRow.handle,
          city: profileRow.city,
          ability_level: profileRow.ability_level,
          avatar_path: null,
          status: "accepted",
          direction: "incoming",
          created_at: "2026-08-03T10:00:00+00:00",
          responded_at: "2026-08-03T10:01:00+00:00",
          email: "x@y.de",
        },
      ],
      error: null,
    });

    await expect(getFriendships()).resolves.toEqual({ status: "unavailable" });
  });

  it("rejects an invalid crew id before opening a client", async () => {
    await expect(getCrewMembers("invalid")).resolves.toEqual({
      status: "unavailable",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("loads block, crew, roster, and invitation DTOs", async () => {
    rpc
      .mockResolvedValueOnce({
        data: [
          {
            id: profileRow.id,
            display_name: profileRow.display_name,
            handle: profileRow.handle,
            avatar_path: null,
            blocked_at: "2026-08-03T10:00:00+00:00",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "30000000-0000-4000-8000-000000000001",
            name: "Weekend Crew",
            city: "innsbruck",
            own_role: "owner",
            member_count: 2,
            created_at: "2026-08-03T10:00:00+00:00",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            user_id: profileRow.id,
            display_name: profileRow.display_name,
            handle: profileRow.handle,
            avatar_path: null,
            role: "owner",
            joined_at: "2026-08-03T10:00:00+00:00",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            invitation_id: "40000000-0000-4000-8000-000000000001",
            crew_id: "30000000-0000-4000-8000-000000000001",
            crew_name: "Weekend Crew",
            invited_by_user_id: profileRow.id,
            invited_by_display_name: profileRow.display_name,
            status: "pending",
            created_at: "2026-08-03T10:00:00+00:00",
          },
        ],
        error: null,
      });

    await expect(getBlockedProfiles()).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ id: profileRow.id })],
    });
    await expect(getCrews()).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ name: "Weekend Crew" })],
    });
    await expect(
      getCrewMembers("30000000-0000-4000-8000-000000000001"),
    ).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ role: "owner" })],
    });
    await expect(getCrewInvitations()).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ status: "pending" })],
    });
  });
});
