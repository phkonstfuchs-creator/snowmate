"use server";

import {
  executeUuidCommand,
  invalidCommandInput,
  type CommandResult,
} from "@/lib/supabase/commands";
import { createClient } from "@/lib/supabase/server";
import {
  accountDeletionRequestSchema,
  exportRequestSchema,
} from "./schema";

export async function requestExportAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = exportRequestSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "request_export",
    { p_idempotency_key: validation.data.idempotencyKey },
    "/settings/privacy",
  );
}

export async function requestAccountDeletionAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = accountDeletionRequestSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  const result = await executeUuidCommand(
    "request_account_deletion",
    {
      p_confirmation: validation.data.confirmation,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/settings/privacy",
  );
  if (!result.ok) return result;

  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // The database account boundary is already closed by the deletion command.
  }

  return result;
}
