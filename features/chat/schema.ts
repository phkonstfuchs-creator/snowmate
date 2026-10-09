import { z } from "zod";

const unsafeMessagePattern = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;
const uuidSchema = z.uuid("Ungültige Kennung.");

function safeTextSchema(maxLength: number, maxMessage: string) {
  return z
    .string()
    .trim()
    .max(maxLength, maxMessage)
    .refine(
      (value) => !unsafeMessagePattern.test(value),
      "Der Text enthält nicht erlaubte Steuerzeichen.",
    );
}

export const createDmSchema = z
  .object({
    targetUserId: uuidSchema,
    idempotencyKey: uuidSchema,
  })
  .strict();

export const sendMessageSchema = z
  .object({
    conversationId: z.uuid("Ungültiger Chat."),
    text: safeTextSchema(
      1000,
      "Nachrichten dürfen höchstens 1000 Zeichen enthalten.",
    ).min(1, "Schreibe eine Nachricht."),
    idempotencyKey: uuidSchema,
  })
  .strict();

export const reportReasonSchema = z.enum([
  "immediate_danger",
  "child_safety",
  "location_privacy",
  "harassment",
  "hate_or_abuse",
  "impersonation",
  "spam",
  "other",
]);

export const createReportSchema = z
  .object({
    targetUserId: uuidSchema,
    reasonCode: reportReasonSchema,
    details: safeTextSchema(
      2000,
      "Meldungen dürfen höchstens 2000 Zeichen enthalten.",
    ).default(""),
    messageId: uuidSchema.optional(),
    rideId: uuidSchema.optional(),
    idempotencyKey: uuidSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.reasonCode === "other" && value.details.length < 10) {
      context.addIssue({
        code: "custom",
        path: ["details"],
        message: "Beschreibe kurz, was passiert ist.",
      });
    }
  });

export const createAppealSchema = z
  .object({
    reportId: uuidSchema,
    text: safeTextSchema(
      2000,
      "Einsprüche dürfen höchstens 2000 Zeichen enthalten.",
    ).min(10, "Begründe deinen Einspruch kurz."),
    idempotencyKey: uuidSchema,
  })
  .strict();

export type CreateDmInput = z.infer<typeof createDmSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type CreateAppealInput = z.infer<typeof createAppealSchema>;
