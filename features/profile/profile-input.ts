import { z } from "zod";
import type { AbilityLevel, City } from "@/lib/types";

/* Mirrors the constraints on public.profiles, so a value that passes
   here is one the database accepts. The database stays the authority;
   this layer exists to give readable messages instead of a 23514. */

export const CITY_VALUES = ["innsbruck", "salzburg"] as const satisfies readonly City[];
export const ABILITY_VALUES = ["chill", "park", "off-piste"] as const satisfies readonly AbilityLevel[];

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(50, "Use at most 50 characters.");

const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^@/, ""))
  .pipe(
    z
      .string()
      .min(3, "Use at least 3 characters.")
      .max(20, "Use at most 20 characters.")
      .regex(/^[a-z0-9_]+$/, "Only letters, numbers and underscores."),
  );

const bioSchema = z
  .string()
  .trim()
  .max(300, "Use at most 300 characters.")
  .transform((value) => (value === "" ? null : value));

export const profileInputSchema = z.object({
  displayName: displayNameSchema,
  handle: handleSchema,
  city: z.enum(CITY_VALUES, "Pick a region."),
  abilityLevel: z.enum(ABILITY_VALUES, "Pick a riding style."),
  bio: bioSchema.optional(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type ProfileField = keyof ProfileInput;
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

export type ProfileValidation =
  | { success: true; data: ProfileInput }
  | { success: false; fieldErrors: ProfileFieldErrors };

export function validateProfileInput(input: unknown): ProfileValidation {
  const result = profileInputSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: ProfileFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ProfileField | undefined;
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return { success: false, fieldErrors };
}

/* The onboarding flow stores its answers in localStorage under this key
   before the account exists. Its shape predates the profile table:
   `style` is the ability level, and fields may be null when a step was
   skipped. */
export const ONBOARDING_DRAFT_KEY = "sm_onboarding_draft";

export function draftToProfileInput(draft: unknown): Record<string, unknown> | null {
  if (typeof draft !== "object" || draft === null || Array.isArray(draft)) {
    return null;
  }
  const value = draft as Record<string, unknown>;
  return {
    displayName: value.displayName,
    handle: value.handle,
    city: value.city,
    abilityLevel: value.style,
  };
}

/* Database row → the fields the UI works with. */
export interface OwnProfile {
  displayName: string | null;
  handle: string | null;
  city: City | null;
  abilityLevel: AbilityLevel | null;
  bio: string | null;
  isMinor: boolean;
  onboardingCompleted: boolean;
}

export interface ProfileRow {
  display_name: string | null;
  handle: string | null;
  city: string | null;
  ability_level: string | null;
  bio: string | null;
  is_minor: boolean;
  onboarding_completed: boolean;
}

function isCity(value: string | null): value is City {
  return value !== null && (CITY_VALUES as readonly string[]).includes(value);
}

function isAbility(value: string | null): value is AbilityLevel {
  return value !== null && (ABILITY_VALUES as readonly string[]).includes(value);
}

export function toOwnProfile(row: ProfileRow): OwnProfile {
  return {
    displayName: row.display_name,
    handle: row.handle,
    city: isCity(row.city) ? row.city : null,
    abilityLevel: isAbility(row.ability_level) ? row.ability_level : null,
    bio: row.bio,
    isMinor: row.is_minor,
    onboardingCompleted: row.onboarding_completed,
  };
}

export function initialsFor(displayName: string | null, handle: string | null): string {
  const source = displayName?.trim() || handle || "";
  const words = source.split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last) return "?";
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
