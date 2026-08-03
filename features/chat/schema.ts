import { z } from "zod";

const unsafeMessagePattern = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;

export const sendMessageSchema = z.object({
  conversationId: z.uuid("Ungültiger Chat."),
  text: z
    .string()
    .trim()
    .min(1, "Schreibe eine Nachricht.")
    .max(1000, "Nachrichten dürfen höchstens 1000 Zeichen enthalten.")
    .refine(
      (value) => !unsafeMessagePattern.test(value),
      "Die Nachricht enthält nicht erlaubte Steuerzeichen.",
    ),
  idempotencyKey: z.uuid("Ungültige Kennung."),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
