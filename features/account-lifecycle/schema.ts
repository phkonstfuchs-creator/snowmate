import { z } from "zod";

export const exportRequestSchema = z
  .object({
    idempotencyKey: z.uuid(),
  })
  .strict();

export const accountDeletionRequestSchema = z
  .object({
    confirmation: z.literal("DELETE"),
    idempotencyKey: z.uuid(),
  })
  .strict();

export type ExportRequestInput = z.infer<typeof exportRequestSchema>;
export type AccountDeletionRequestInput = z.infer<
  typeof accountDeletionRequestSchema
>;
