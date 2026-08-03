import type { ProfileFieldErrors, ProfileSetupValues } from "./schema";

export interface ProfileActionState {
  status: "idle" | "error";
  message: string;
  values: ProfileSetupValues;
  fieldErrors?: ProfileFieldErrors;
}

export const initialProfileActionState: ProfileActionState = {
  status: "idle",
  message: "",
  values: {
    displayName: "",
    handle: "",
    city: "",
    abilityLevel: "",
  },
};
