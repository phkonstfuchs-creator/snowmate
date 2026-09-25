"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DraftAdoptionResult, ProfileActionState } from "./action-state";
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

  if (!validation.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: validation.fieldErrors,
    };
  }

  const outcome = await writeProfile(validation.data, { onlyIfIncomplete: false });

  switch (outcome) {
    case "saved":
      return { status: "success", message: "Profile saved." };
    case "handle_taken":
      return {
        status: "error",
        message: "That handle is taken.",
        fieldErrors: { handle: "That handle is taken." },
      };
    case "unauthenticated":
      return { status: "error", message: "Your session ended. Sign in again." };
    default:
      return {
        status: "error",
        message: "Saving is temporarily unavailable. Try again shortly.",
      };
  }
}
