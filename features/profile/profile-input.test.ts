import { describe, expect, it } from "vitest";
import {
  draftToProfileInput,
  initialsFor,
  toOwnProfile,
  validateProfileInput,
} from "./profile-input";

const valid = {
  displayName: "  Lena Moser ",
  handle: "@Lena_M",
  city: "innsbruck",
  abilityLevel: "park",
};

describe("validateProfileInput", () => {
  it("normalises a valid profile", () => {
    expect(validateProfileInput(valid)).toEqual({
      success: true,
      data: {
        displayName: "Lena Moser",
        handle: "lena_m",
        city: "innsbruck",
        abilityLevel: "park",
      },
    });
  });

  it("turns an empty bio into null", () => {
    const result = validateProfileInput({ ...valid, bio: "   " });
    expect(result.success && result.data.bio).toBeNull();
  });

  it("reports the first problem per field", () => {
    const result = validateProfileInput({
      displayName: "A",
      handle: "no spaces!",
      city: "vienna",
      abilityLevel: "",
      bio: "x".repeat(301),
    });

    expect(result).toEqual({
      success: false,
      fieldErrors: {
        displayName: "Use at least 2 characters.",
        handle: "Only letters, numbers and underscores.",
        city: "Pick a region.",
        abilityLevel: "Pick a riding style.",
        bio: "Use at most 300 characters.",
      },
    });
  });

  it("rejects handles outside the database length bounds", () => {
    expect(validateProfileInput({ ...valid, handle: "ab" }).success).toBe(false);
    expect(validateProfileInput({ ...valid, handle: "a".repeat(21) }).success).toBe(false);
  });

  it("rejects input that is not an object", () => {
    expect(validateProfileInput(null).success).toBe(false);
  });
});

describe("draftToProfileInput", () => {
  it("maps the onboarding draft shape", () => {
    expect(
      draftToProfileInput({ city: "salzburg", style: "chill", displayName: "Max", handle: "max" }),
    ).toEqual({ displayName: "Max", handle: "max", city: "salzburg", abilityLevel: "chill" });
  });

  it.each([null, "text", 3, ["a"]])("returns null for %j", (draft) => {
    expect(draftToProfileInput(draft)).toBeNull();
  });
});

describe("toOwnProfile", () => {
  it("maps a row and drops unknown enum values", () => {
    expect(
      toOwnProfile({
        display_name: "Max",
        handle: "max",
        city: "vienna",
        ability_level: "moguls",
        bio: null,
        is_minor: true,
        onboarding_completed: false,
      }),
    ).toEqual({
      displayName: "Max",
      handle: "max",
      city: null,
      abilityLevel: null,
      bio: null,
      isMinor: true,
      onboardingCompleted: false,
    });
  });

  it("keeps known enum values", () => {
    const profile = toOwnProfile({
      display_name: null,
      handle: null,
      city: "salzburg",
      ability_level: "off-piste",
      bio: "hi",
      is_minor: false,
      onboarding_completed: true,
    });
    expect(profile.city).toBe("salzburg");
    expect(profile.abilityLevel).toBe("off-piste");
  });
});

describe("initialsFor", () => {
  it.each([
    ["Lena Moser", null, "LM"],
    ["Lena Maria Moser", null, "LM"],
    ["Lena", null, "LE"],
    [null, "max_r", "MA"],
    ["   ", null, "?"],
    [null, null, "?"],
  ])("%j / %j → %s", (name, handle, expected) => {
    expect(initialsFor(name, handle)).toBe(expected);
  });
});
