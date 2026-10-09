import { z } from "zod";
import { reportReasonSchema } from "./schema";

const uuidSchema = z.uuid();
const timestampSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));
const handleSchema = z.string().regex(/^[a-z0-9_]{3,20}$/);
const avatarPathSchema = z.string().max(255).nullable();

const conversationRowSchema = z
  .object({
    id: uuidSchema,
    kind: z.enum(["dm", "ride"]),
    ride_id: uuidSchema.nullable(),
    title: z.string().min(1).max(100),
    counterpart_user_id: uuidSchema.nullable(),
    counterpart_handle: handleSchema.nullable(),
    counterpart_avatar_path: avatarPathSchema,
    last_message_preview: z.string().max(1000).nullable(),
    last_message_at: timestampSchema.nullable(),
    created_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    kind: row.kind,
    rideId: row.ride_id,
    title: row.title,
    counterpart: row.counterpart_user_id
      ? {
          userId: row.counterpart_user_id,
          handle: row.counterpart_handle,
          avatarPath: row.counterpart_avatar_path,
        }
      : null,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  }));

const messageRowSchema = z
  .object({
    id: uuidSchema,
    sender_id: uuidSchema,
    sender_display_name: z.string().min(2).max(50),
    sender_avatar_path: avatarPathSchema,
    body: z.string().min(1).max(1000),
    created_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    senderId: row.sender_id,
    senderDisplayName: row.sender_display_name,
    senderAvatarPath: row.sender_avatar_path,
    body: row.body,
    createdAt: row.created_at,
  }));

const ownReportRowSchema = z
  .object({
    id: uuidSchema,
    target_user_id: uuidSchema.nullable(),
    reason_code: reportReasonSchema,
    message_id: uuidSchema.nullable(),
    ride_id: uuidSchema.nullable(),
    details: z.string().max(2000),
    status: z.enum(["open", "triaged", "actioned", "dismissed", "closed"]),
    priority: z.enum(["normal", "critical"]),
    severity: z.enum(["low", "medium", "high", "critical"]),
    created_at: timestampSchema,
    target_response_at: timestampSchema,
    resolved_at: timestampSchema.nullable(),
    appeal_status: z.enum(["pending", "upheld", "rejected"]).nullable(),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    targetUserId: row.target_user_id,
    reasonCode: row.reason_code,
    messageId: row.message_id,
    rideId: row.ride_id,
    details: row.details,
    status: row.status,
    priority: row.priority,
    severity: row.severity,
    createdAt: row.created_at,
    targetResponseAt: row.target_response_at,
    resolvedAt: row.resolved_at,
    appealStatus: row.appeal_status,
  }));

export type Conversation = z.output<typeof conversationRowSchema>;
export type Message = z.output<typeof messageRowSchema>;
export type OwnReport = z.output<typeof ownReportRowSchema>;

export function parseConversationRows(value: unknown): Conversation[] | null {
  const parsed = z.array(conversationRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseMessageRows(value: unknown): Message[] | null {
  const parsed = z.array(messageRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseOwnReportRows(value: unknown): OwnReport[] | null {
  const parsed = z.array(ownReportRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}
