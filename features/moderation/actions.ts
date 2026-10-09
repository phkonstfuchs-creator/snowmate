"use server";

import {
  executeUuidCommand,
  invalidCommandInput,
  type CommandResult,
} from "@/lib/supabase/commands";
import {
  moderateReportSchema,
  resolveReportAppealSchema,
} from "./schema";

export async function moderateReportAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = moderateReportSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "moderate_report",
    {
      p_report_id: validation.data.reportId,
      p_new_status: validation.data.newStatus,
      p_action: validation.data.action,
      p_reason: validation.data.reason,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/moderation",
  );
}

export async function resolveReportAppealAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = resolveReportAppealSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "resolve_report_appeal",
    {
      p_appeal_id: validation.data.appealId,
      p_outcome: validation.data.outcome,
      p_reason: validation.data.reason,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/moderation",
  );
}
