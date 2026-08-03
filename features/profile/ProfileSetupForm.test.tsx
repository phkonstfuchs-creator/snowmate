import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileSetupForm from "./ProfileSetupForm";
import { PROFILE_DRAFT_KEY } from "./draft-storage";

vi.mock("./actions", () => ({
  completeProfileAction: vi.fn(async (state) => state),
}));

const emptyProfile = {
  displayName: "",
  handle: "",
  city: "" as const,
  abilityLevel: "" as const,
};

describe("ProfileSetupForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("prefills empty fields from the public onboarding draft", async () => {
    sessionStorage.setItem(
      PROFILE_DRAFT_KEY,
      JSON.stringify({
        displayName: "Philipp Fuchs",
        handle: "philipp_f",
        city: "innsbruck",
        style: "off-piste",
      }),
    );

    render(<ProfileSetupForm initialValues={emptyProfile} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Philipp Fuchs");
    });
    expect(screen.getByLabelText("Handle")).toHaveValue("philipp_f");
    expect(
      screen.getByRole("button", { name: "Innsbruck" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Off-Piste/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps existing server profile values ahead of browser draft values", async () => {
    sessionStorage.setItem(
      PROFILE_DRAFT_KEY,
      JSON.stringify({
        displayName: "Browser Name",
        handle: "browser_name",
        city: "salzburg",
        style: "park",
      }),
    );

    render(
      <ProfileSetupForm
        initialValues={{
          displayName: "Server Name",
          handle: "server_name",
          city: "innsbruck",
          abilityLevel: "chill",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Server Name");
    });
    expect(screen.getByLabelText("Handle")).toHaveValue("server_name");
    expect(
      screen.getByRole("button", { name: "Innsbruck" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Chill/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("fills only missing fields when the server profile is partial", async () => {
    sessionStorage.setItem(
      PROFILE_DRAFT_KEY,
      JSON.stringify({
        displayName: "Browser Name",
        handle: "browser_name",
        city: "salzburg",
        style: "park",
      }),
    );

    render(
      <ProfileSetupForm
        initialValues={{
          ...emptyProfile,
          displayName: "Server Name",
          city: "innsbruck",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Server Name");
    });
    expect(screen.getByLabelText("Handle")).toHaveValue("browser_name");
    expect(
      screen.getByRole("button", { name: "Innsbruck" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Park/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("removes an invalid browser draft", async () => {
    sessionStorage.setItem(PROFILE_DRAFT_KEY, "not-json");

    render(<ProfileSetupForm initialValues={emptyProfile} />);

    await waitFor(() => {
      expect(sessionStorage.getItem(PROFILE_DRAFT_KEY)).toBeNull();
    });
  });
});
