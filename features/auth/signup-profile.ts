import { z } from "zod";
import { profileInputSchema } from "@/features/profile/profile-input";
import { ageOn, MAX_AGE, MIN_AGE, parseBirthDate } from "@/features/profile/birth-date";
import type { MessageKey } from "@/lib/i18n/translate";

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

const HANDLE = /^[a-z0-9_]{3,20}$/;

/* Why "Next" on the profile step is still greyed out, as one sentence
   under it, in the order of the fields. The age rule is checked here
   too, so nobody under 14 types an e-mail and password first. */
export function profileStepIssue(
  step: { name: string; handle: string; handleTaken: boolean; birthDate: string },
  today: string,
): MessageKey | null {
  if (step.name.trim().length < 2) return "onb.needName";
  if (!HANDLE.test(step.handle)) return "onb.needHandle";
  if (step.handleTaken) return "v.handleTaken";
  if (!step.birthDate) return "onb.needBirthDate";
  const date = parseBirthDate(step.birthDate);
  if (!date) return "age.invalid";
  const age = ageOn(date, today);
  if (age < 0 || age > MAX_AGE) return "age.invalid";
  if (age < MIN_AGE) return "age.tooYoung";
  return null;
}
