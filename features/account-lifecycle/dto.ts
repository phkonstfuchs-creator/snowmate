import { z } from "zod";

const timestampSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));

const exportRequestRowSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(["ready", "expired"]),
    requested_at: timestampSchema,
    expires_at: timestampSchema,
    downloaded_at: timestampSchema.nullable(),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    downloadedAt: row.downloaded_at,
  }));

const deletionJobStatusSchema = z.enum([
  "pending",
  "processing",
  "failed",
  "completed",
]);
const optionalStepStatusSchema = z.enum([
  "pending",
  "skipped",
  "completed",
  "failed",
]);

const accountDeletionStatusRowSchema = z
  .object({
    id: z.uuid(),
    status: deletionJobStatusSchema,
    storage_status: optionalStepStatusSchema,
    database_status: z.enum(["pending", "completed", "failed"]),
    brevo_status: optionalStepStatusSchema,
    posthog_status: optionalStepStatusSchema,
    requested_at: timestampSchema,
    escalation_at: timestampSchema,
    hard_deadline_at: timestampSchema,
    completed_at: timestampSchema.nullable(),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    status: row.status,
    storageStatus: row.storage_status,
    databaseStatus: row.database_status,
    brevoStatus: row.brevo_status,
    posthogStatus: row.posthog_status,
    requestedAt: row.requested_at,
    escalationAt: row.escalation_at,
    hardDeadlineAt: row.hard_deadline_at,
    completedAt: row.completed_at,
  }));

export type ExportRequest = z.output<typeof exportRequestRowSchema>;
export type AccountDeletionStatus = z.output<
  typeof accountDeletionStatusRowSchema
>;

export function parseExportRequestRows(
  value: unknown,
): ExportRequest[] | null {
  const parsed = z.array(exportRequestRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseAccountDeletionStatusRows(
  value: unknown,
): AccountDeletionStatus[] | null {
  const parsed = z.array(accountDeletionStatusRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}
