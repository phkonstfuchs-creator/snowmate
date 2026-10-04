import { z } from "zod";
import { profileInputSchema } from "@/features/profile/profile-input";
import { ageOn, MAX_AGE, MIN_AGE, parseBirthDate } from "@/features/profile/birth-date";

/* Everything the onboarding asks before the account exists. The database
   applies the same rules again when it copies the values into the
   profile (private.apply_signup_metadata). */
export function signupProfileSchema(today: string) {
  return profileInputSchema.omit({ bio: true }).extend({
    birthDate: z
      .string()
      .trim()
      .transform((value, ctx) => {
        const date = parseBirthDate(value);
        if (!date) {
          ctx.addIssue({ code: "custom", message: "age.invalid" });
          return z.NEVER;
        }
        const age = ageOn(date, today);
        if (age < 0 || age > MAX_AGE) {
          ctx.addIssue({ code: "custom", message: "age.invalid" });
          return z.NEVER;
        }
        if (age < MIN_AGE) {
          ctx.addIssue({ code: "custom", message: "age.tooYoung" });
          return z.NEVER;
        }
        return date;
      }),
  });
}

export type SignupProfile = z.infer<ReturnType<typeof signupProfileSchema>>;
export type SignupProfileField = keyof SignupProfile;
export type SignupProfileErrors = Partial<Record<SignupProfileField, string>>;

export function validateSignupProfile(
  input: unknown,
  today: string,
): { success: true; data: SignupProfile } | { success: false; fieldErrors: SignupProfileErrors } {
  const result = signupProfileSchema(today).safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: SignupProfileErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as SignupProfileField | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { success: false, fieldErrors };
}

/* What the sign-up sends to Supabase as user metadata. */
export function toSignupMetadata(profile: SignupProfile) {
  return {
    display_name: profile.displayName,
    handle: profile.handle,
    city: profile.city,
    riding_styles: profile.ridingStyles,
    birth_date: profile.birthDate,
  };
}

/* Today in Vienna as YYYY-MM-DD, the day the database counts ages by. */
export function viennaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna" }).format(now);
}
