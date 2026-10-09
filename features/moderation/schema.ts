import { z } from "zod";

const unsafeTextPattern = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;
const uuidSchema = z.uuid("Ungültige Kennung.");

const moderationReasonSchema = z
  .string()
  .trim()
  .min(5, "Begründe die Entscheidung kurz.")
  .max(2000, "Begründungen dürfen höchstens 2000 Zeichen enthalten.")
  .refine(
    (value) => !unsafeTextPattern.test(value),
    "Die Begründung enthält nicht erlaubte Steuerzeichen.",
  );

export const moderationReportStatusSchema = z.enum([
  "triaged",
  "actioned",
  "dismissed",
  "closed",
]);

export const moderationActionSchema = z.enum([
  "no_action",
  "escalated",
  "content_removed",
  "warning",
  "account_restricted",
  "account_suspended",
  "account_banned",
]);

const enforcementActions = new Set<z.infer<typeof moderationActionSchema>>([
  "content_removed",
  "warning",
  "account_restricted",
  "account_suspended",
  "account_banned",
]);

export const moderateReportSchema = z
  .object({
    reportId: uuidSchema,
    newStatus: moderationReportStatusSchema,
    action: moderationActionSchema,
    reason: moderationReasonSchema,
    idempotencyKey: uuidSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const validCombination =
      (value.newStatus === "triaged" && value.action === "escalated") ||
      (value.newStatus === "actioned" &&
        enforcementActions.has(value.action)) ||
      ((value.newStatus === "dismissed" || value.newStatus === "closed") &&
        value.action === "no_action");

    if (!validCombination) {
      context.addIssue({
        code: "custom",
        path: ["action"],
        message: "Status und Maßnahme passen nicht zusammen.",
      });
    }
  });

export const resolveReportAppealSchema = z
  .object({
    appealId: uuidSchema,
    outcome: z.enum(["upheld", "rejected"]),
    reason: moderationReasonSchema,
    idempotencyKey: uuidSchema,
  })
  .strict();

export type ModerateReportInput = z.infer<typeof moderateReportSchema>;
export type ResolveReportAppealInput = z.infer<
  typeof resolveReportAppealSchema
>;
