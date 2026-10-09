import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  publishLocationAction,
  startLocationSessionAction,
  stopLocationSessionAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const rpc = vi.fn();
const sessionId = "10000000-0000-4000-8000-000000000001";
const rideId = "20000000-0000-4000-8000-000000000001";
const idempotencyKey = "30000000-0000-4000-8000-000000000001";

describe("location commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T10:00:00.000Z"));
    mocks.createClient.mockResolvedValue({ rpc });
    rpc.mockResolvedValue({ data: sessionId, error: null });
  });

  afterEach(() => vi.useRealTimers());

  it("starts only an explicit foreground session", async () => {
    await expect(
      startLocationSessionAction({
        resortId: "stubai-glacier",
        audience: "friends-of-friends",
        rideId,
        durationHours: 4,
        idempotencyKey,
      }),
    ).resolves.toEqual({ ok: true, id: sessionId });
    expect(rpc).toHaveBeenCalledWith("start_location_session", {
      p_audience: "friends-of-friends",
      p_duration_hours: 4,
      p_foreground_only: true,
      p_idempotency_key: idempotencyKey,
      p_resort_id: "stubai-glacier",
      p_ride_id: rideId,
    });
  });

  it("publishes a fresh coordinate without accepting an owner id", async () => {
    await publishLocationAction({
      sessionId,
      latitude: 47.011,
      longitude: 11.302,
      accuracyMeters: 18,
      capturedAt: "2026-08-03T09:59:30.000Z",
      idempotencyKey,
    });

    expect(rpc).toHaveBeenCalledWith("publish_location", {
      p_accuracy_meters: 18,
      p_idempotency_key: idempotencyKey,
      p_is_foreground: true,
      p_latitude: 47.011,
      p_longitude: 11.302,
      p_observed_at: "2026-08-03T09:59:30.000Z",
      p_session_id: sessionId,
    });
  });

  it("stops the authenticated owner session idempotently", async () => {
    await stopLocationSessionAction({ sessionId, idempotencyKey });

    expect(rpc).toHaveBeenCalledWith("stop_location_session", {
      p_idempotency_key: idempotencyKey,
      p_session_id: sessionId,
    });
  });

  it("rejects stale coordinates before opening a database client", async () => {
    const result = await publishLocationAction({
      sessionId,
      latitude: 47.011,
      longitude: 11.302,
      accuracyMeters: 18,
      capturedAt: "2026-08-03T09:50:00.000Z",
      idempotencyKey,
    });

    expect(result.ok).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
