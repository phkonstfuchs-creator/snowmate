import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfileSetupScreen from "./ProfileSetupScreen";

vi.mock("./ProfileSetupForm", () => ({
  default: () => <div>Profile form</div>,
}));

vi.mock("./ProfileAccessActions", () => ({
  default: () => <button>Abmelden</button>,
}));

describe("ProfileSetupScreen", () => {
  it("lets an incomplete account leave the protected setup flow", () => {
    render(
      <ProfileSetupScreen
        initialValues={{
          displayName: "",
          handle: "",
          city: "",
          abilityLevel: "",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Jetzt wirst du sichtbar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeInTheDocument();
  });
});
