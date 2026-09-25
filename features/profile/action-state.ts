import type { ProfileFieldErrors } from "./profile-input";

export interface ProfileActionState {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: ProfileFieldErrors;
}

export const initialProfileActionState: ProfileActionState = {
  status: "idle",
  message: "",
};

export type DraftAdoptionResult =
  | "saved"
  | "skipped"
  | "invalid"
  | "handle_taken"
  | "unauthenticated"
  | "unavailable";
