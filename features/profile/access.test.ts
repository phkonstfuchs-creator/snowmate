import { describe, expect, it } from "vitest";
import { getProfileAccessDecision } from "./access";

const completeProfile = {
  displayName: "Philipp Fuchs",
  handle: "philipp_f",
  city: "innsbruck" as const,
  abilityLevel: "chill" as const,
  onboardingCompleted: true,
};

describe("getProfileAccessDecision", () => {
  it("requires login for a signed-out request", () => {
    expect(getProfileAccessDecision({ status: "signed-out" })).toBe("login");
  });

  it("fails closed when profile state is unavailable", () => {
    expect(getProfileAccessDecision({ status: "unavailable" })).toBe(
      "unavailable",
    );
  });

  it.each([
    null,
    {
      ...completeProfile,
      displayName: null,
      onboardingCompleted: false,
    },
  ])("requires profile completion for %j", (profile) => {
    expect(
      getProfileAccessDecision({ status: "authenticated", profile }),
    ).toBe("complete-profile");
  });

  it("allows only a complete and internally consistent profile", () => {
    expect(
      getProfileAccessDecision({
        status: "authenticated",
        profile: completeProfile,
      }),
    ).toBe("allow");
  });
});
