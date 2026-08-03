import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CurrentProfileContext } from "./model";

const PROFILE_PROJECTION =
  "display_name, handle, city, ability_level, onboarding_completed";

const profileRowSchema = z.object({
  display_name: z.string().nullable(),
  handle: z.string().nullable(),
  city: z.enum(["innsbruck", "salzburg"]).nullable(),
  ability_level: z.enum(["chill", "park", "off-piste"]).nullable(),
  onboarding_completed: z.boolean(),
});

export async function getCurrentProfileContext(): Promise<CurrentProfileContext> {
  try {
    const supabase = await createClient();
    const authResult = await supabase.auth.getClaims();

    if (authResult.error) {
      return { status: "unavailable" };
    }

    const userId = authResult.data?.claims?.sub;

    if (typeof userId !== "string") {
      return { status: "signed-out" };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_PROJECTION)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return { status: "unavailable" };
    }

    if (!data) {
      return { status: "unavailable" };
    }

    const parsedProfile = profileRowSchema.safeParse(data);

    if (!parsedProfile.success) {
      return { status: "unavailable" };
    }

    return {
      status: "authenticated",
      profile: {
        displayName: parsedProfile.data.display_name,
        handle: parsedProfile.data.handle,
        city: parsedProfile.data.city,
        abilityLevel: parsedProfile.data.ability_level,
        onboardingCompleted: parsedProfile.data.onboarding_completed,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
