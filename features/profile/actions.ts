"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { translateFieldErrors } from "@/lib/i18n/translate";
import type { DraftAdoptionResult, ProfileActionState } from "./action-state";
import { BIRTH_DATE_MESSAGES, isBirthDateStatus, parseBirthDate } from "./birth-date";
import {
  draftToProfileInput,
  validateProfileInput,
  type ProfileInput,
} from "./profile-input";

const UNIQUE_VIOLATION = "23505";

type SaveOutcome = "saved" | "handle_taken" | "unauthenticated" | "unavailable";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/* The user id comes from the verified session, never from the caller.
   RLS scopes the update to the caller's own row as a second line. */
async function writeProfile(
  input: ProfileInput,
  options: { onlyIfIncomplete: boolean },
): Promise<SaveOutcome | "skipped"> {
  const supabase = await createClient();

  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return "unauthenticated";
    }

    let query = supabase
      .from("profiles")
      .update({
        display_name: input.displayName,
        handle: input.handle,
        city: input.city,
        ability_level: input.abilityLevel,
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
      })
      .eq("id", userId);

    if (options.onlyIfIncomplete) {
      query = query.eq("onboarding_completed", false);
    }

    const { data, error } = await query.select("id");

    if (error) {
      return error.code === UNIQUE_VIOLATION ? "handle_taken" : "unavailable";
    }

    if (!data || data.length === 0) {
      return options.onlyIfIncomplete ? "skipped" : "unavailable";
    }
  } catch {
    return "unavailable";
  }

  revalidatePath("/profile");
  return "saved";
}

/* Adopts the answers the onboarding flow parked in localStorage before
   the account existed. Never overwrites a profile that is already
   complete, so an old draft on a shared device cannot clobber edits. */
export async function adoptOnboardingDraftAction(
  draft: unknown,
): Promise<DraftAdoptionResult> {
  const validation = validateProfileInput(draftToProfileInput(draft));

  if (!validation.success) {
    return "invalid";
  }

  return writeProfile(validation.data, { onlyIfIncomplete: true });
}

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const validation = validateProfileInput({
    displayName: stringField(formData, "displayName"),
    handle: stringField(formData, "handle"),
    city: stringField(formData, "city"),
    abilityLevel: stringField(formData, "abilityLevel"),
    bio: stringField(formData, "bio"),
  });
  const t = await getT();

  if (!validation.success) {
    return {
      status: "error",
      message: t("v.checkFields"),
      fieldErrors: translateFieldErrors(t, validation.fieldErrors),
    };
  }

  const outcome = await writeProfile(validation.data, { onlyIfIncomplete: false });

  switch (outcome) {
    case "saved":
      return { status: "success", message: t("profile.saved") };
    case "handle_taken":
      return {
        status: "error",
        message: t("v.handleTaken"),
        fieldErrors: { handle: t("v.handleTaken") },
      };
    case "unauthenticated":
      return { status: "error", message: t("profile.sessionEnded") };
    default:
      return {
        status: "error",
        message: t("profile.saveUnavailable"),
      };
  }
}

/* Stores the caller's birth date once; the database derives is_minor
   from it and refuses a second change. */
export async function setBirthDateAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const t = await getT();
  const birthDate = parseBirthDate(stringField(formData, "birthDate"));

  if (!birthDate) {
    return { status: "error", message: t("age.invalid") };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_my_birth_date", { p_birth_date: birthDate });

    if (error || !isBirthDateStatus(data)) {
      return { status: "error", message: t("profile.saveUnavailable") };
    }

    if (data !== "set") {
      return { status: "error", message: t(BIRTH_DATE_MESSAGES[data]) };
    }
  } catch {
    return { status: "error", message: t("profile.saveUnavailable") };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: t("age.set") };
}
