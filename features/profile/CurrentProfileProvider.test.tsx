import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CurrentProfileProvider,
  useCurrentProfile,
} from "./CurrentProfileProvider";
import { PROFILE_DRAFT_KEY } from "./draft-storage";

const profile = {
  displayName: "Philipp Fuchs",
  handle: "philipp_f",
  city: "innsbruck" as const,
  abilityLevel: "park" as const,
  onboardingCompleted: true as const,
};

function ProfileProbe() {
  const currentProfile = useCurrentProfile();
  return <span>{`${currentProfile.displayName} @${currentProfile.handle}`}</span>;
}

describe("CurrentProfileProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("provides the completed server profile and clears the consumed draft", async () => {
    sessionStorage.setItem(PROFILE_DRAFT_KEY, "old draft");

    render(
      <CurrentProfileProvider profile={profile}>
        <ProfileProbe />
      </CurrentProfileProvider>,
    );

    expect(screen.getByText("Philipp Fuchs @philipp_f")).toBeInTheDocument();
    await waitFor(() => {
      expect(sessionStorage.getItem(PROFILE_DRAFT_KEY)).toBeNull();
    });
  });
});
