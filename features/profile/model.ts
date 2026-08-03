import type { AbilityLevel, City } from "@/lib/types";

export interface CurrentProfile {
  displayName: string | null;
  handle: string | null;
  city: City | null;
  abilityLevel: AbilityLevel | null;
  onboardingCompleted: boolean;
}

export interface CompletedProfile {
  displayName: string;
  handle: string;
  city: City;
  abilityLevel: AbilityLevel;
}

export type CurrentProfileContext =
  | { status: "signed-out" }
  | { status: "unavailable" }
  | { status: "authenticated"; profile: CurrentProfile | null };

export function asCompletedProfile(
  profile: CurrentProfile | null,
): CompletedProfile | null {
  if (
    !profile?.onboardingCompleted ||
    !profile.displayName ||
    !profile.handle ||
    !profile.city ||
    !profile.abilityLevel
  ) {
    return null;
  }

  return {
    displayName: profile.displayName,
    handle: profile.handle,
    city: profile.city,
    abilityLevel: profile.abilityLevel,
  };
}
