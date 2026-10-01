import { z } from "zod";

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

const signupCredentialsSchema = loginCredentialsSchema
  .extend({
    password: z
      .string()
      .min(12, "v.min|12")
      .max(128, "v.passwordTooLong")
      .regex(/[a-z]/, "v.passwordLower")
      .regex(/[A-Z]/, "v.passwordUpper")
      .regex(/[0-9]/, "v.passwordNumber"),
    confirmPassword: z.string().max(128, "v.passwordTooLong"),
  })
  .refine(
    ({ password, confirmPassword }) => password === confirmPassword,
    {
      message: "v.passwordMismatch",
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
