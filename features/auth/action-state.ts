import type { CredentialFieldErrors } from "./credentials";

export interface AuthActionState {
  status: "idle" | "error" | "success";
  message: string;
  email?: string;
  fieldErrors?: CredentialFieldErrors;
}

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
};
