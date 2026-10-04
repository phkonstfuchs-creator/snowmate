import { z } from "zod";
import { containsEmailName, isCommonPassword } from "./password-strength";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "v.emailTooLong")
  .email("v.emailInvalid");

const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "v.enterPassword")
    .max(128, "v.passwordTooLong"),
});

/* Shared by sign-up, password reset and password change. */
export const newPasswordSchema = z
  .string()
  .min(12, "v.min|12")
  .max(128, "v.passwordTooLong")
  .regex(/[a-z]/, "v.passwordLower")
  .regex(/[A-Z]/, "v.passwordUpper")
  .regex(/[0-9]/, "v.passwordNumber")
  .refine((value) => !isCommonPassword(value), "v.passwordCommon");

const signupCredentialsSchema = loginCredentialsSchema
  .extend({
    password: newPasswordSchema,
    confirmPassword: z.string().max(128, "v.passwordTooLong"),
  })
  .refine(
    ({ password, email }) => !containsEmailName(password, email),
    { message: "v.passwordEmail", path: ["password"] },
  )
  .refine(
    ({ password, confirmPassword }) => password === confirmPassword,
    {
      message: "v.passwordMismatch",
      path: ["confirmPassword"],
    },
  );

const newPasswordPairSchema = z
  .object({ password: newPasswordSchema, confirmPassword: z.string().max(128, "v.passwordTooLong") })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "v.passwordMismatch",
    path: ["confirmPassword"],
  });

const emailOnlySchema = z.object({ email: emailSchema });

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
  return error.flatten().fieldErrors as CredentialFieldErrors;
}

function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    return { success: false, fieldErrors: fieldErrors(result.error) };
  }

  return { success: true, data: result.data };
}

export function validateLoginCredentials(input: unknown): ValidationResult<LoginCredentials> {
  return validate(loginCredentialsSchema, input);
}

export function validateSignupCredentials(input: unknown): ValidationResult<SignupCredentials> {
  return validate(signupCredentialsSchema, input);
}

export function validateNewPassword(input: unknown): ValidationResult<{ password: string; confirmPassword: string }> {
  return validate(newPasswordPairSchema, input);
}

export function validateEmailOnly(input: unknown): ValidationResult<{ email: string }> {
  return validate(emailOnlySchema, input);
}

/* A six-digit authenticator code. */
export function parseOtpCode(value: string): string | null {
  const digits = value.replace(/\s+/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}
