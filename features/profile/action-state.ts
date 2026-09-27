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

export interface DeleteAccountState {
  status: "idle" | "error";
  message: string;
}

export const initialDeleteAccountState: DeleteAccountState = { status: "idle", message: "" };

/* The word the user types to confirm. A second, deliberate step keeps a
   stray tap from erasing an account. */
export const DELETE_CONFIRMATION = "delete";
