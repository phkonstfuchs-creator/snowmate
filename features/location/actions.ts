"use server";

import {
  executeUuidCommand,
  invalidCommandInput,
  type CommandResult,
} from "@/lib/supabase/commands";
import {
  createLocationUpdateSchema,
  startLocationSessionSchema,
  stopLocationSessionSchema,
} from "./schema";

export async function startLocationSessionAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = startLocationSessionSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "start_location_session",
    {
      p_resort_id: validation.data.resortId,
      p_audience: validation.data.audience,
      p_ride_id: validation.data.rideId ?? null,
      p_foreground_only: true,
      p_idempotency_key: validation.data.idempotencyKey,
      p_duration_hours: validation.data.durationHours,
    },
    "/map",
  );
}

export async function publishLocationAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = createLocationUpdateSchema().safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "publish_location",
    {
      p_session_id: validation.data.sessionId,
      p_latitude: validation.data.latitude,
      p_longitude: validation.data.longitude,
      p_accuracy_meters: validation.data.accuracyMeters,
      p_observed_at: validation.data.capturedAt,
      p_is_foreground: true,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/map",
  );
}

export async function stopLocationSessionAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = stopLocationSessionSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "stop_location_session",
    {
      p_session_id: validation.data.sessionId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/map",
  );
}
