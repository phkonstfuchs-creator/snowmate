import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email address is too long.")
  .email("Enter a valid email address.");

const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Password is too long."),
});

const signupCredentialsSchema = loginCredentialsSchema
  .extend({
    password: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(128, "Password is too long.")
      .regex(/[a-z]/, "Add a lowercase letter.")
      .regex(/[A-Z]/, "Add an uppercase letter.")
      .regex(/[0-9]/, "Add a number."),
    confirmPassword: z.string().max(128, "Password is too long."),
  })
  .refine(
    ({ password, confirmPassword }) => password === confirmPassword,
    {
      message: "Passwords do not match.",
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
