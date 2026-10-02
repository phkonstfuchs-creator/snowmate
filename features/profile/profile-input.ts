import { z } from "zod";
import type { AbilityLevel, City } from "@/lib/types";

/* Mirrors the constraints on public.profiles, so a value that passes
   here is one the database accepts. The database stays the authority;
   this layer exists to give readable messages instead of a 23514. */

export const CITY_VALUES = ["innsbruck", "salzburg"] as const satisfies readonly City[];
export const ABILITY_VALUES = ["chill", "park", "off-piste"] as const satisfies readonly AbilityLevel[];

/* Mirrors profiles_display_name_safe: no control or bidi-override
   characters, which could disguise a name. */
const UNSAFE_NAME_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

/* Mirrors profiles_handle_not_reserved. */
export const RESERVED_HANDLES: readonly string[] = ["admin", "support", "snowmate"];

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "v.min|2")
  .max(50, "v.max|50")
  .refine((value) => !UNSAFE_NAME_CHARACTERS.test(value), "v.specialChars");

const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^@/, ""))
  .pipe(
    z
      .string()
      .min(3, "v.min|3")
      .max(20, "v.max|20")
      .regex(/^[a-z0-9_]+$/, "v.handleChars")
      .refine((value) => !RESERVED_HANDLES.includes(value), "v.handleReserved"),
  );

const bioSchema = z
  .string()
  .trim()
  .max(300, "v.max|300")
  .transform((value) => (value === "" ? null : value));

export const profileInputSchema = z.object({
  displayName: displayNameSchema,
  handle: handleSchema,
  city: z.enum(CITY_VALUES, "v.pickRegion"),
  abilityLevel: z.enum(ABILITY_VALUES, "v.pickStyle"),
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
  /* ISO date, visible to the owner only; null until they add it. */
  birthDate: string | null;
  isMinor: boolean;
  onboardingCompleted: boolean;
}

export interface ProfileRow {
  display_name: string | null;
  handle: string | null;
  city: string | null;
  ability_level: string | null;
  bio: string | null;
  birth_date?: string | null;
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
    birthDate: row.birth_date ?? null,
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
