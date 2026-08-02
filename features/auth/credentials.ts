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

const signupCredentialsSchema = loginCredentialsSchema
  .extend({
    password: z
      .string()
      .min(12, "Verwende mindestens 12 Zeichen.")
      .max(128, "Passwort ist zu lang.")
      .regex(/[a-z]/, "Füge einen Kleinbuchstaben hinzu.")
      .regex(/[A-Z]/, "Füge einen Großbuchstaben hinzu.")
      .regex(/[0-9]/, "Füge eine Zahl hinzu."),
    confirmPassword: z.string().max(128, "Passwort ist zu lang."),
  })
  .refine(
    ({ password, confirmPassword }) => password === confirmPassword,
    {
      message: "Passwörter stimmen nicht überein.",
      path: ["confirmPassword"],
    },
  );

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
export type SignupCredentials = z.infer<typeof signupCredentialsSchema>;

export type CredentialField = "email" | "password" | "confirmPassword";
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
): ValidationResult<SignupCredentials> {
  const result = signupCredentialsSchema.safeParse(input);

  if (!result.success) {
    return { success: false, fieldErrors: fieldErrors(result.error) };
  }

  return { success: true, data: result.data };
}
