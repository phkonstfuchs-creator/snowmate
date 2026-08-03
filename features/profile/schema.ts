import { z } from "zod";
import type { AbilityLevel, City } from "@/lib/types";

const citySchema = z.enum(["innsbruck", "salzburg"], {
  error: "Wähle eine verfügbare Region.",
});

const abilityLevelSchema = z.enum(["chill", "park", "off-piste"], {
  error: "Wähle deinen Fahrstil.",
});

const unsafeDisplayNamePattern = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;
const reservedHandles = new Set(["admin", "support", "snowmate"]);

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Dein Name muss mindestens 2 Zeichen lang sein.")
  .max(50, "Dein Name darf höchstens 50 Zeichen lang sein.")
  .refine(
    (value) => !unsafeDisplayNamePattern.test(value),
    "Dein Name enthält nicht erlaubte Steuerzeichen.",
  );

const handleSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9_]{3,20}$/,
        "Nutze 3–20 Kleinbuchstaben, Zahlen oder Unterstriche.",
      ),
  )
  .refine(
    (value) => !reservedHandles.has(value),
    "Dieses Handle ist für Snowmate reserviert.",
  );

const profileSchema = z.object({
  displayName: displayNameSchema,
  handle: handleSchema,
  city: citySchema,
  abilityLevel: abilityLevelSchema,
});

export type ProfileValues = z.infer<typeof profileSchema>;

export interface ProfileSetupValues {
  displayName: string;
  handle: string;
  city: City | "";
  abilityLevel: AbilityLevel | "";
}

export type ProfileFieldErrors = Partial<
  Record<keyof ProfileValues, string[]>
>;

export type ProfileValidationResult =
  | { success: true; data: ProfileValues }
  | { success: false; fieldErrors: ProfileFieldErrors };

export function validateProfileInput(input: unknown): ProfileValidationResult {
  const result = profileSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    fieldErrors: result.error.flatten().fieldErrors,
  };
}

export function parseOnboardingDraft(
  serializedDraft: string | null,
): Partial<ProfileValues> {
  if (!serializedDraft || serializedDraft.length > 4096) {
    return {};
  }

  try {
    const draft: unknown = JSON.parse(serializedDraft);

    if (typeof draft !== "object" || draft === null || Array.isArray(draft)) {
      return {};
    }

    const values = draft as Record<string, unknown>;
    const displayName = displayNameSchema.safeParse(values.displayName);
    const handle = handleSchema.safeParse(values.handle);
    const city = citySchema.safeParse(values.city);
    const abilityLevel = abilityLevelSchema.safeParse(values.style);

    return {
      ...(displayName.success ? { displayName: displayName.data } : {}),
      ...(handle.success ? { handle: handle.data } : {}),
      ...(city.success ? { city: city.data } : {}),
      ...(abilityLevel.success
        ? { abilityLevel: abilityLevel.data }
        : {}),
    };
  } catch {
    return {};
  }
}
