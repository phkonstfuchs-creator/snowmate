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
   stray tap from erasing an account. Either language's word works, so a
   language switch mid-flow cannot lock anyone in. */
export const DELETE_CONFIRMATION = "delete";
export const DELETE_CONFIRMATION_WORDS: readonly string[] = ["delete", "löschen"];

export function isDeleteConfirmation(value: string): boolean {
  return DELETE_CONFIRMATION_WORDS.includes(value.trim().toLocaleLowerCase("de"));
}
