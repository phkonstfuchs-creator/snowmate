import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelCarpoolAction,
  cancelRideAction,
  createCarpoolAction,
  createRideAction,
  leaveCarpoolAction,
  leaveRideAction,
  requestRideAction,
  respondCarpoolRequestAction,
  respondRideRequestAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const rpc = vi.fn();

describe("ride commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T08:00:00.000Z"));
    mocks.createClient.mockResolvedValue({ rpc });
  });

  afterEach(() => vi.useRealTimers());

  it("maps validated creation data without accepting a client user id", async () => {
    rpc.mockResolvedValue({
      data: "10000000-0000-4000-8000-000000000001",
      error: null,
    });

    const result = await createRideAction({
      resortId: "stubai-glacier",
      abilityLevel: "chill",
      startsAt: "2026-08-04T08:00:00.000Z",
      capacity: 4,
      audience: "friends",
      caption: "Erste Gondel",
      meetingPoint: "Talstation Kassa 2",
      idempotencyKey: "20000000-0000-4000-8000-000000000001",
    });

    expect(result).toEqual({
      ok: true,
      id: "10000000-0000-4000-8000-000000000001",
    });
    expect(rpc).toHaveBeenCalledWith("create_ride", {
      p_ability_level: "chill",
      p_audience: "friends",
      p_capacity: 4,
      p_caption: "Erste Gondel",
      p_idempotency_key: "20000000-0000-4000-8000-000000000001",
      p_meeting_point: "Talstation Kassa 2",
      p_resort_id: "stubai-glacier",
      p_starts_at: "2026-08-04T08:00:00.000Z",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feed");
  });

  it("rejects invalid creation input before opening a database client", async () => {
    const result = await createRideAction({ capacity: 99 });

    expect(result.ok).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("requests a ride using only the session-bound command RPC", async () => {
    rpc.mockResolvedValue({
      data: "30000000-0000-4000-8000-000000000001",
      error: null,
    });

    await expect(
      requestRideAction({
        rideId: "10000000-0000-4000-8000-000000000001",
        idempotencyKey: "20000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({
      ok: true,
      id: "30000000-0000-4000-8000-000000000001",
    });
    expect(rpc).toHaveBeenCalledWith("request_ride", {
      p_idempotency_key: "20000000-0000-4000-8000-000000000001",
      p_ride_id: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("maps a database rate limit without exposing database details", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001" } });

    await expect(
      requestRideAction({
        rideId: "10000000-0000-4000-8000-000000000001",
        idempotencyKey: "20000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({
      ok: false,
      message: "Zu viele Anfragen. Warte kurz und versuche es erneut.",
    });
  });

  it("responds to a ride request with an explicit decision", async () => {
    rpc.mockResolvedValue({
      data: "30000000-0000-4000-8000-000000000001",
      error: null,
    });

    await respondRideRequestAction({
      requestId: "30000000-0000-4000-8000-000000000001",
      accept: true,
      idempotencyKey: "20000000-0000-4000-8000-000000000001",
    });

    expect(rpc).toHaveBeenCalledWith("respond_ride_request", {
      p_accept: true,
      p_idempotency_key: "20000000-0000-4000-8000-000000000001",
      p_request_id: "30000000-0000-4000-8000-000000000001",
    });
  });

  it("creates and responds to a carpool without client identity fields", async () => {
    rpc.mockResolvedValue({
      data: "40000000-0000-4000-8000-000000000001",
      error: null,
    });

    await createCarpoolAction({
      resortId: "stubai-glacier",
      city: "innsbruck",
      role: "driver",
      departureAt: "2026-08-04T08:00:00.000Z",
      totalSeats: 3,
      audience: "friends",
      note: "Frühe Abfahrt",
      departurePoint: "Innsbruck Hauptbahnhof",
      idempotencyKey: "20000000-0000-4000-8000-000000000001",
    });
    expect(rpc).toHaveBeenLastCalledWith("create_carpool", {
      p_audience: "friends",
      p_city: "innsbruck",
      p_departure_point: "Innsbruck Hauptbahnhof",
      p_departs_at: "2026-08-04T08:00:00.000Z",
      p_idempotency_key: "20000000-0000-4000-8000-000000000001",
      p_note: "Frühe Abfahrt",
      p_resort_id: "stubai-glacier",
      p_role: "driver",
      p_seat_capacity: 3,
    });

    await respondCarpoolRequestAction({
      requestId: "50000000-0000-4000-8000-000000000001",
      accept: false,
      idempotencyKey: "20000000-0000-4000-8000-000000000002",
    });
    expect(rpc).toHaveBeenLastCalledWith("respond_carpool_request", {
      p_accept: false,
      p_idempotency_key: "20000000-0000-4000-8000-000000000002",
      p_request_id: "50000000-0000-4000-8000-000000000001",
    });
  });

  it("makes leaving and cancelling coordination records idempotent", async () => {
    rpc.mockResolvedValue({
      data: "10000000-0000-4000-8000-000000000001",
      error: null,
    });
    const rideInput = {
      rideId: "10000000-0000-4000-8000-000000000001",
      idempotencyKey: "20000000-0000-4000-8000-000000000001",
    };
    const carpoolInput = {
      carpoolId: "40000000-0000-4000-8000-000000000001",
      idempotencyKey: "20000000-0000-4000-8000-000000000002",
    };

    await leaveRideAction(rideInput);
    expect(rpc).toHaveBeenLastCalledWith("leave_ride", {
      p_idempotency_key: rideInput.idempotencyKey,
      p_ride_id: rideInput.rideId,
    });
    await cancelRideAction(rideInput);
    expect(rpc).toHaveBeenLastCalledWith("cancel_ride", {
      p_idempotency_key: rideInput.idempotencyKey,
      p_ride_id: rideInput.rideId,
    });
    await leaveCarpoolAction(carpoolInput);
    expect(rpc).toHaveBeenLastCalledWith("leave_carpool", {
      p_carpool_id: carpoolInput.carpoolId,
      p_idempotency_key: carpoolInput.idempotencyKey,
    });
    await cancelCarpoolAction(carpoolInput);
    expect(rpc).toHaveBeenLastCalledWith("cancel_carpool", {
      p_carpool_id: carpoolInput.carpoolId,
      p_idempotency_key: carpoolInput.idempotencyKey,
    });
  });
});
