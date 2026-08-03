import { describe, expect, it } from "vitest";
import {
  parseOnboardingDraft,
  validateProfileInput,
} from "./schema";

describe("validateProfileInput", () => {
  it("normalizes a valid profile", () => {
    expect(
      validateProfileInput({
        displayName: "  Philipp Fuchs  ",
        handle: "  PHILIPP_F  ",
        city: "innsbruck",
        abilityLevel: "off-piste",
      }),
    ).toEqual({
      success: true,
      data: {
        displayName: "Philipp Fuchs",
        handle: "philipp_f",
        city: "innsbruck",
        abilityLevel: "off-piste",
      },
    });
  });

  it("returns German field errors for invalid values", () => {
    const result = validateProfileInput({
      displayName: "P",
      handle: "Nicht gültig",
      city: "berlin",
      abilityLevel: "race",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.displayName).toBeDefined();
      expect(result.fieldErrors.handle).toBeDefined();
      expect(result.fieldErrors.city).toBeDefined();
      expect(result.fieldErrors.abilityLevel).toBeDefined();
    }
  });

  it.each([
    ["Zeilen\numbruch", "normal_handle"],
    ["Täuschung\u202Eeman", "normal_handle"],
    ["Normaler Name", "admin"],
    ["Normaler Name", "support"],
    ["Normaler Name", "snowmate"],
  ])("rejects unsafe identity values", (displayName, handle) => {
    const result = validateProfileInput({
      displayName,
      handle,
      city: "innsbruck",
      abilityLevel: "chill",
    });

    expect(result.success).toBe(false);
  });
});

describe("parseOnboardingDraft", () => {
  it("maps the public onboarding draft to profile fields", () => {
    expect(
      parseOnboardingDraft(
        JSON.stringify({
          displayName: "Philipp Fuchs",
          handle: "philipp_f",
          city: "salzburg",
          style: "park",
        }),
      ),
    ).toEqual({
      displayName: "Philipp Fuchs",
      handle: "philipp_f",
      city: "salzburg",
      abilityLevel: "park",
    });
  });

  it("keeps valid draft fields when the public flow skipped a style", () => {
    expect(
      parseOnboardingDraft(
        JSON.stringify({
          displayName: "Philipp Fuchs",
          handle: "philipp_f",
          city: "innsbruck",
          style: null,
        }),
      ),
    ).toEqual({
      displayName: "Philipp Fuchs",
      handle: "philipp_f",
      city: "innsbruck",
    });
  });

  it.each([null, "", "not-json", JSON.stringify({ city: "berlin" })])(
    "ignores an invalid draft: %s",
    (draft) => {
      expect(parseOnboardingDraft(draft)).toEqual({});
    },
  );

  it("ignores an oversized browser draft before parsing it", () => {
    expect(parseOnboardingDraft("x".repeat(4097))).toEqual({});
  });
});
