import { z } from "zod";

import { reportReasonSchema } from "@/features/chat/schema";

const uuidSchema = z.uuid();
const timestampSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));
const reportStatusSchema = z.enum([
  "open",
  "triaged",
  "actioned",
  "dismissed",
  "closed",
]);

const moderationQueueRowSchema = z
  .object({
    id: uuidSchema,
    reporter_id: uuidSchema.nullable(),
    target_user_id: uuidSchema.nullable(),
    reason_code: reportReasonSchema,
    message_id: uuidSchema.nullable(),
    ride_id: uuidSchema.nullable(),
    details: z.string().max(2000),
    reported_message_body: z.string().min(1).max(1000).nullable(),
    status: reportStatusSchema,
    priority: z.enum(["normal", "critical"]),
    severity: z.enum(["low", "medium", "high", "critical"]),
    created_at: timestampSchema,
    target_response_at: timestampSchema,
    pending_appeals: z.number().int().min(0),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    reporterId: row.reporter_id,
    targetUserId: row.target_user_id,
    reasonCode: row.reason_code,
    messageId: row.message_id,
    rideId: row.ride_id,
    details: row.details,
    reportedMessageBody: row.reported_message_body,
    status: row.status,
    priority: row.priority,
    severity: row.severity,
    createdAt: row.created_at,
    targetResponseAt: row.target_response_at,
    pendingAppeals: row.pending_appeals,
  }));

const moderationAppealRowSchema = z
  .object({
    id: uuidSchema,
    report_id: uuidSchema,
    appellant_id: uuidSchema.nullable(),
    body: z.string().min(10).max(2000).nullable(),
    status: z.enum(["pending", "upheld", "rejected"]),
    target_response_at: timestampSchema,
    resolved_at: timestampSchema.nullable(),
    created_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    reportId: row.report_id,
    appellantId: row.appellant_id,
    body: row.body,
    status: row.status,
    targetResponseAt: row.target_response_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }));

export type ModerationQueueItem = z.output<
  typeof moderationQueueRowSchema
>;
export type ModerationAppeal = z.output<typeof moderationAppealRowSchema>;

export function parseModerationQueueRows(
  value: unknown,
): ModerationQueueItem[] | null {
  const parsed = z.array(moderationQueueRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseModerationAppealRows(
  value: unknown,
): ModerationAppeal[] | null {
  const parsed = z.array(moderationAppealRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}
