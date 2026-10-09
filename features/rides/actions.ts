"use server";

import {
  executeUuidCommand,
  invalidCommandInput,
  type CommandResult,
} from "@/lib/supabase/commands";
import {
  cancelCarpoolInputSchema,
  cancelRideInputSchema,
  createCarpoolInputSchema,
  createRideInputSchema,
  leaveCarpoolInputSchema,
  leaveRideInputSchema,
  requestCarpoolInputSchema,
  requestRideInputSchema,
  respondCarpoolRequestInputSchema,
  respondRideRequestInputSchema,
} from "./schema";

export type { CommandResult } from "@/lib/supabase/commands";

export async function createRideAction(input: unknown): Promise<CommandResult> {
  const validation = createRideInputSchema().safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "create_ride",
    {
      p_resort_id: validation.data.resortId,
      p_ability_level: validation.data.abilityLevel,
      p_starts_at: validation.data.startsAt,
      p_capacity: validation.data.capacity,
      p_audience: validation.data.audience,
      p_caption: validation.data.caption,
      p_meeting_point: validation.data.meetingPoint,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/feed",
  );
}

export async function requestRideAction(input: unknown): Promise<CommandResult> {
  const validation = requestRideInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "request_ride",
    {
      p_ride_id: validation.data.rideId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/feed",
  );
}

export async function respondRideRequestAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = respondRideRequestInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "respond_ride_request",
    {
      p_request_id: validation.data.requestId,
      p_accept: validation.data.accept,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/feed",
  );
}

export async function createCarpoolAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = createCarpoolInputSchema().safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "create_carpool",
    {
      p_resort_id: validation.data.resortId,
      p_city: validation.data.city,
      p_role: validation.data.role,
      p_departs_at: validation.data.departureAt,
      p_seat_capacity: validation.data.totalSeats,
      p_audience: validation.data.audience,
      p_note: validation.data.note,
      p_departure_point: validation.data.departurePoint,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/carpool",
  );
}

export async function requestCarpoolAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = requestCarpoolInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "request_carpool",
    {
      p_carpool_id: validation.data.carpoolId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/carpool",
  );
}

export async function respondCarpoolRequestAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = respondCarpoolRequestInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "respond_carpool_request",
    {
      p_request_id: validation.data.requestId,
      p_accept: validation.data.accept,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/carpool",
  );
}

export async function leaveRideAction(input: unknown): Promise<CommandResult> {
  const validation = leaveRideInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "leave_ride",
    {
      p_ride_id: validation.data.rideId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/feed",
  );
}

export async function cancelRideAction(input: unknown): Promise<CommandResult> {
  const validation = cancelRideInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "cancel_ride",
    {
      p_ride_id: validation.data.rideId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/feed",
  );
}

export async function leaveCarpoolAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = leaveCarpoolInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "leave_carpool",
    {
      p_carpool_id: validation.data.carpoolId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/carpool",
  );
}

export async function cancelCarpoolAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = cancelCarpoolInputSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "cancel_carpool",
    {
      p_carpool_id: validation.data.carpoolId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/carpool",
  );
}
