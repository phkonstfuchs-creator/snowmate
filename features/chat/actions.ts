"use server";

import {
  executeUuidCommand,
  invalidCommandInput,
  type CommandResult,
} from "@/lib/supabase/commands";
import {
  createAppealSchema,
  createDmSchema,
  createReportSchema,
  sendMessageSchema,
} from "./schema";

export async function createDmAction(input: unknown): Promise<CommandResult> {
  const validation = createDmSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "create_dm",
    {
      p_target_user_id: validation.data.targetUserId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/chat",
  );
}

export async function sendMessageAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = sendMessageSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "send_message",
    {
      p_conversation_id: validation.data.conversationId,
      p_body: validation.data.text,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/chat",
  );
}

export async function createReportAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = createReportSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "create_report",
    {
      p_target_user_id: validation.data.targetUserId,
      p_reason_code: validation.data.reasonCode,
      p_details: validation.data.details,
      p_message_id: validation.data.messageId ?? null,
      p_ride_id: validation.data.rideId ?? null,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/reports",
  );
}

export async function createAppealAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = createAppealSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "create_appeal",
    {
      p_report_id: validation.data.reportId,
      p_body: validation.data.text,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/reports",
  );
}
