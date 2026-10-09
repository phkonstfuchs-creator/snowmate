import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCarpoolDetail,
  getCarpoolFeed,
  getCarpoolMembers,
  getCarpoolRequests,
  getRideDetail,
  getRideFeed,
  getRideMembers,
  getRideRequests,
} from "./data";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const rpc = vi.fn();

const validRow = {
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
  audience: "friends",
  caption: "Erste Gondel",
  status: "scheduled",
  created_at: "2026-08-03T08:00:00+00:00",
};

describe("ride data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("reads the broad DTO through its RPC", async () => {
    rpc.mockResolvedValue({ data: [validRow], error: null });

    await expect(getRideFeed("innsbruck")).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ id: validRow.id })],
    });
    expect(rpc).toHaveBeenCalledWith("get_ride_feed", {
      p_city: "innsbruck",
      p_limit: 50,
    });
  });

  it("fails closed on RPC errors or malformed DTOs", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
    await expect(getRideFeed("innsbruck")).resolves.toEqual({
      status: "unavailable",
    });

    rpc.mockResolvedValueOnce({
      data: [{ ...validRow, meeting_point: "leaked" }],
      error: null,
    });
    await expect(getRideFeed("innsbruck")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("distinguishes missing ride details from unavailable data", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(
      getRideDetail("10000000-0000-4000-8000-000000000001"),
    ).resolves.toEqual({ status: "not-found" });

    rpc.mockResolvedValueOnce({
      data: [{ ...validRow, meeting_point: "Talstation", can_view_exact: true }],
      error: null,
    });
    await expect(
      getRideDetail("10000000-0000-4000-8000-000000000001"),
    ).resolves.toEqual({
      status: "ready",
      data: expect.objectContaining({ meetingPoint: "Talstation" }),
    });
  });

  it("loads carpool feed and detail DTOs", async () => {
    const carpoolRow = {
      id: "60000000-0000-4000-8000-000000000001",
      host_id: validRow.host_id,
      host_display_name: validRow.host_display_name,
      host_handle: validRow.host_handle,
      host_avatar_path: null,
      resort_id: validRow.resort_id,
      resort_name: validRow.resort_name,
      city: "innsbruck",
      role: "driver",
      departs_at: "2026-08-04T08:00:00+00:00",
      seat_capacity: 3,
      available_seats: 2,
      audience: "friends",
      note: "Frühe Abfahrt",
      status: "scheduled",
      created_at: "2026-08-03T08:00:00+00:00",
    };

    rpc.mockResolvedValueOnce({ data: [carpoolRow], error: null });
    await expect(getCarpoolFeed("innsbruck")).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ id: carpoolRow.id })],
    });

    rpc.mockResolvedValueOnce({
      data: [
        {
          ...carpoolRow,
          departure_point: "Innsbruck Hauptbahnhof",
          can_view_exact: true,
        },
      ],
      error: null,
    });
    await expect(getCarpoolDetail(carpoolRow.id)).resolves.toEqual({
      status: "ready",
      data: expect.objectContaining({
        departurePoint: "Innsbruck Hauptbahnhof",
      }),
    });
  });

  it("loads ride roster and request DTOs only through RPCs", async () => {
    const profile = {
      user_id: "30000000-0000-4000-8000-000000000001",
      display_name: "Mira Berg",
      handle: "mira_berg",
      avatar_path: null,
    };
    rpc.mockResolvedValueOnce({
      data: [
        {
          ride_id: validRow.id,
          ...profile,
          role: "participant",
          joined_at: "2026-08-03T09:00:00+00:00",
        },
      ],
      error: null,
    });
    await expect(getRideMembers(validRow.id)).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ rideId: validRow.id })],
    });
    expect(rpc).toHaveBeenLastCalledWith("get_ride_members", {
      p_ride_id: validRow.id,
    });

    rpc.mockResolvedValueOnce({
      data: [
        {
          id: "50000000-0000-4000-8000-000000000001",
          ride_id: validRow.id,
          requester_id: profile.user_id,
          requester_display_name: profile.display_name,
          requester_handle: profile.handle,
          requester_avatar_path: null,
          status: "pending",
          created_at: "2026-08-03T09:00:00+00:00",
          responded_at: null,
        },
      ],
      error: null,
    });
    await expect(getRideRequests(validRow.id)).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ status: "pending" })],
    });
  });

  it("loads carpool roster DTOs and fails closed on malformed requests", async () => {
    const carpoolId = "60000000-0000-4000-8000-000000000001";
    rpc.mockResolvedValueOnce({
      data: [
        {
          carpool_id: carpoolId,
          user_id: "30000000-0000-4000-8000-000000000001",
          display_name: "Mira Berg",
          handle: "mira_berg",
          avatar_path: null,
          joined_at: "2026-08-03T09:00:00+00:00",
        },
      ],
      error: null,
    });
    await expect(getCarpoolMembers(carpoolId)).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ carpoolId })],
    });

    rpc.mockResolvedValueOnce({
      data: [{ carpool_id: carpoolId, leaked_email: "private@example.com" }],
      error: null,
    });
    await expect(getCarpoolRequests(carpoolId)).resolves.toEqual({
      status: "unavailable",
    });
  });
});
