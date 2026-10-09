import { z } from "zod";

const uuidSchema = z.uuid("Ungültige Kennung.");
const unsafeTextPattern = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;
const inviteTokenSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.string().regex(/^[a-f0-9]{64}$/, "Einladung ist ungültig."));

export const friendshipRequestSchema = z
  .object({
    targetId: uuidSchema,
    idempotencyKey: uuidSchema,
    inviteToken: inviteTokenSchema.optional(),
  })
  .strict();

export const friendshipResponseSchema = z
  .object({
    friendshipId: uuidSchema,
    accept: z.boolean(),
    idempotencyKey: uuidSchema,
  })
  .strict();

export const blockUserSchema = z
  .object({
    targetId: uuidSchema,
    idempotencyKey: uuidSchema,
  })
  .strict();

export const unblockUserSchema = blockUserSchema;

export const createCrewSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Der Crew-Name ist zu kurz.")
      .max(40, "Der Crew-Name ist zu lang.")
      .refine(
        (value) => !unsafeTextPattern.test(value),
        "Der Crew-Name enthält nicht erlaubte Zeichen.",
      ),
    city: z.enum(["innsbruck", "salzburg"]),
    idempotencyKey: uuidSchema,
  })
  .strict();

export const inviteCrewMemberSchema = z
  .object({
    crewId: uuidSchema,
    targetId: uuidSchema,
    idempotencyKey: uuidSchema,
  })
  .strict();

export const crewInvitationResponseSchema = z
  .object({
    invitationId: uuidSchema,
    accept: z.boolean(),
    idempotencyKey: uuidSchema,
  })
  .strict();

export type FriendshipRequestInput = z.infer<typeof friendshipRequestSchema>;
export type FriendshipResponseInput = z.infer<
  typeof friendshipResponseSchema
>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type CreateCrewInput = z.infer<typeof createCrewSchema>;
export type InviteCrewMemberInput = z.infer<typeof inviteCrewMemberSchema>;
export type CrewInvitationResponseInput = z.infer<
  typeof crewInvitationResponseSchema
>;
