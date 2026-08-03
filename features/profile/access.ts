import {
  asCompletedProfile,
  type CurrentProfileContext,
} from "./model";

export type ProfileAccessDecision =
  | "allow"
  | "login"
  | "complete-profile"
  | "unavailable";

export function getProfileAccessDecision(
  context: CurrentProfileContext,
): ProfileAccessDecision {
  if (context.status === "signed-out") {
    return "login";
  }

  if (context.status === "unavailable") {
    return "unavailable";
  }

  return asCompletedProfile(context.profile) ? "allow" : "complete-profile";
}
