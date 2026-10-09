import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-Mail-Adresse ist zu lang.")
  .email("Gib eine gültige E-Mail-Adresse ein.");

const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Gib dein Passwort ein.")
    .max(128, "Passwort ist zu lang."),
});

const inviteTokenSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_-]{32,512}$/,
    "Gib einen gültigen Einladungscode ein.",
  );

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string): Date | null {
  if (!dateOnlyPattern.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function createSignupCredentialsSchema(now: Date) {
  const today = utcDate(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const oldestSupported = utcDate(
    today.getUTCFullYear() - 120,
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const youngestSupported = utcDate(
    today.getUTCFullYear() - 16,
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  return loginCredentialsSchema.extend({
    password: z
      .string()
      .min(12, "Verwende mindestens 12 Zeichen.")
      .max(128, "Passwort ist zu lang.")
      .regex(/[a-z]/, "Füge einen Kleinbuchstaben hinzu.")
      .regex(/[A-Z]/, "Füge einen Großbuchstaben hinzu.")
      .regex(/[0-9]/, "Füge eine Zahl hinzu."),
    confirmPassword: z.string().max(128, "Passwort ist zu lang."),
    inviteToken: inviteTokenSchema,
    birthDate: z.string().refine((value) => parseDateOnly(value) !== null, {
      message: "Gib ein gültiges Geburtsdatum ein.",
    }),
    termsAccepted: z.boolean().refine(Boolean, {
      message: "Akzeptiere die Nutzungsbedingungen.",
    }),
    privacyAccepted: z.boolean().refine(Boolean, {
      message: "Bestätige, dass du die Datenschutzerklärung gelesen hast.",
    }),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
      message: "Passwörter stimmen nicht überein.",
      path: ["confirmPassword"],
      });
    }

    const birthDate = parseDateOnly(value.birthDate);
    if (!birthDate) return;

    if (birthDate > youngestSupported) {
      context.addIssue({
        code: "custom",
        message: "Pistl ist erst ab 16 Jahren verfügbar.",
        path: ["birthDate"],
      });
    } else if (birthDate < oldestSupported) {
      context.addIssue({
        code: "custom",
        message: "Prüfe dein Geburtsdatum.",
        path: ["birthDate"],
      });
    }
  });
}

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
export type SignupCredentials = z.infer<
  ReturnType<typeof createSignupCredentialsSchema>
>;

export type CredentialField =
  | "email"
  | "password"
  | "confirmPassword"
  | "inviteToken"
  | "birthDate"
  | "termsAccepted"
  | "privacyAccepted";
export type CredentialFieldErrors = Partial<
  Record<CredentialField, string[]>
>;

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: CredentialFieldErrors };

function fieldErrors(error: z.ZodError): CredentialFieldErrors {
  return error.flatten().fieldErrors;
}

export function validateLoginCredentials(
  input: unknown,
): ValidationResult<LoginCredentials> {
  const result = loginCredentialsSchema.safeParse(input);

  if (!result.success) {
    return { success: false, fieldErrors: fieldErrors(result.error) };
  }

  return { success: true, data: result.data };
}

export function validateSignupCredentials(
  input: unknown,
  now = new Date(),
): ValidationResult<SignupCredentials> {
  const result = createSignupCredentialsSchema(now).safeParse(input);

  if (!result.success) {
    return { success: false, fieldErrors: fieldErrors(result.error) };
  }

  return { success: true, data: result.data };
}

export function validatedInviteToken(value: unknown): string {
  if (Array.isArray(value)) return "";
  const result = inviteTokenSchema.safeParse(value);
  return result.success ? result.data : "";
}
