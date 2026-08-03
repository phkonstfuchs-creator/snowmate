"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileActionState } from "./action-state";
import {
  type ProfileSetupValues,
  validateProfileInput,
} from "./schema";

const SAVE_ERROR =
  "Dein Profil konnte gerade nicht gespeichert werden. Versuche es gleich noch einmal.";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readValues(formData: FormData): ProfileSetupValues {
  const city = stringField(formData, "city");
  const abilityLevel = stringField(formData, "abilityLevel");

  return {
    displayName: stringField(formData, "displayName"),
    handle: stringField(formData, "handle"),
    city: city === "innsbruck" || city === "salzburg" ? city : "",
    abilityLevel:
      abilityLevel === "chill" ||
      abilityLevel === "park" ||
      abilityLevel === "off-piste"
        ? abilityLevel
        : "",
  };
}

function unavailableState(values: ProfileSetupValues): ProfileActionState {
  return {
    status: "error",
    message: SAVE_ERROR,
    values,
  };
}

export async function completeProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const values = readValues(formData);
  const validation = validateProfileInput(values);

  if (!validation.success) {
    return {
      status: "error",
      message: "Bitte prüfe die markierten Felder.",
      values,
      fieldErrors: validation.fieldErrors,
    };
  }

  let supabase;
  let claims: { sub?: unknown } | null | undefined;

  try {
    supabase = await createClient();
    const authResult = await supabase.auth.getClaims();

    if (authResult.error) {
      return unavailableState(values);
    }

    claims = authResult.data?.claims;
  } catch {
    return unavailableState(values);
  }

  if (typeof claims?.sub !== "string") {
    redirect("/login");
  }

  try {
    const { data, error } = await supabase.rpc("complete_own_profile", {
      p_ability_level: validation.data.abilityLevel,
      p_city: validation.data.city,
      p_display_name: validation.data.displayName,
      p_handle: validation.data.handle,
    });

    if (error?.code === "23505") {
      return {
        status: "error",
        message: "Dieses Handle ist bereits vergeben.",
        values,
        fieldErrors: { handle: ["Wähle ein anderes Handle."] },
      };
    }

    if (error || data !== true) {
      return unavailableState(values);
    }
  } catch {
    return unavailableState(values);
  }

  redirect("/feed");
}
