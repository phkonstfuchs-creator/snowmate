"use server";
import {
  executeUuidCommand,
  invalidCommandInput,
  type CommandResult,
} from "@/lib/supabase/commands";
import {
  setGoInterestInputSchema,
  withdrawGoInterestInputSchema,
} from "./schema";
export async function setGoInterestAction(
  input: unknown,
): Promise<CommandResult> {
  const result = setGoInterestInputSchema.safeParse(input);
  if (!result.success) return invalidCommandInput();
  const data = result.data;
  return executeUuidCommand(
    "set_ride_go_interest",
    {
      p_ride_id: data.rideId,
      p_minimum_group: data.minimumGroup,
      p_needs_carpool: data.needsCarpool,
      p_idempotency_key: data.idempotencyKey,
    },
    "/feed",
  );
}
export async function withdrawGoInterestAction(
  input: unknown,
): Promise<CommandResult> {
  const result = withdrawGoInterestInputSchema.safeParse(input);
  if (!result.success) return invalidCommandInput();
  return executeUuidCommand(
    "withdraw_ride_go_interest",
    {
      p_ride_id: result.data.rideId,
      p_idempotency_key: result.data.idempotencyKey,
    },
    "/feed",
  );
}
