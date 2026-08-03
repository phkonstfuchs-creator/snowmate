import { z } from "zod";

const uuidSchema = z.uuid("Ungültige Kennung.");
const inviteTokenSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.string().regex(/^[a-f0-9]{64}$/, "Einladung ist ungültig."));

export const friendshipRequestSchema = z.object({
  targetId: uuidSchema,
  idempotencyKey: uuidSchema,
  inviteToken: inviteTokenSchema.optional(),
});

export const friendshipResponseSchema = z.object({
  friendshipId: uuidSchema,
  accept: z.boolean(),
  idempotencyKey: uuidSchema,
});

export const blockUserSchema = z.object({
  targetId: uuidSchema,
  idempotencyKey: uuidSchema,
});

export type FriendshipRequestInput = z.infer<typeof friendshipRequestSchema>;
export type FriendshipResponseInput = z.infer<
  typeof friendshipResponseSchema
>;
