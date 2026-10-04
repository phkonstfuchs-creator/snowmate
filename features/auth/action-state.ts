import type { CredentialFieldErrors } from "./credentials";
import type { SignupProfileErrors } from "./signup-profile";

export interface AuthActionState {
  status: "idle" | "error" | "success";
  message: string;
  email?: string;
  fieldErrors?: CredentialFieldErrors;
  /* Sign-up only: problems with the onboarding answers. */
  profileErrors?: SignupProfileErrors;
}

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
};

export type HandleCheck = "available" | "taken" | "invalid" | "unknown";
