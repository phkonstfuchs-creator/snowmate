import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfileScreen from "./ProfileScreen";
import type { OwnProfile } from "./profile-input";

vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));
vi.mock("./actions", () => ({ updateProfileAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const incomplete: OwnProfile = {
  displayName: null,
  handle: null,
  city: null,
  abilityLevel: null,
  bio: null,
  isMinor: true,
  onboardingCompleted: false,
};

describe("ProfileScreen", () => {
  it("shows the sample rider in the demo and cannot edit", () => {
    render(<ProfileScreen />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Felix Gruber");
    expect(screen.getByText("Stamps")).toBeInTheDocument();
    expect(screen.queryByText("Profile incomplete")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the signed-in account and its region", () => {
    render(
      <ProfileScreen
        account={{ ...incomplete, displayName: "Lena Moser", handle: "lena_m", city: "salzburg", abilityLevel: "park", onboardingCompleted: true }}
        stats={{ rides: 3, resorts: 2, crew: 5 }}
      />,
    );

    expect(screen.getByText("Salzburg · Park")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("Stamps")).not.toBeInTheDocument();
    expect(screen.queryByText(/XP to level/)).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lena Moser");
    expect(screen.getByText("@lena_m")).toBeInTheDocument();
    expect(screen.getByText("LM")).toBeInTheDocument();
    expect(screen.getByText(/Season 25\/26 · Salzburg/)).toBeInTheDocument();
    expect(screen.queryByText("Profile incomplete")).not.toBeInTheDocument();
  });

  it("prompts an incomplete account to finish and opens the editor", () => {
    render(<ProfileScreen account={incomplete} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("New rider");
    fireEvent.click(screen.getByText("Profile incomplete"));
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();
  });

  it("falls back gracefully when the profile could not be loaded", () => {
    render(<ProfileScreen account={null} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("New rider");
    expect(screen.getByText("Rider")).toBeInTheDocument();
    expect(screen.getAllByText("–")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();
  });
});
