import { fireEvent, render, screen } from "@testing-library/react";
import { seasonLabel } from "@/lib/season";
import { describe, expect, it, vi } from "vitest";
import ProfileScreen from "./ProfileScreen";
import type { OwnProfile } from "./profile-input";

vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn(), updatePasswordAction: vi.fn() }));
vi.mock("./security-actions", () => ({ enrollMfaAction: vi.fn(), confirmMfaAction: vi.fn(), disableMfaAction: vi.fn() }));
vi.mock("./actions", () => ({ updateProfileAction: vi.fn(), setBirthDateAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const incomplete: OwnProfile = {
  displayName: null,
  handle: null,
  city: null,
  abilityLevel: null,
  ridingStyles: [],
  bio: null,
  birthDate: null,
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

  it("points a rider without a ski day this season to the map", () => {
    const lastSeason = { id: "d1", resort: "Nordkette", startedAt: "2026-02-10T09:00:00Z", endedAt: "2026-02-10T15:00:00Z", distanceM: 20000, verticalM: 5000, maxSpeedKmh: 60, runs: 10 };
    const { rerender } = render(<ProfileScreen account={{ ...incomplete, onboardingCompleted: true }} skiDays={[lastSeason]} today="2026-10-07" />);
    expect(screen.getByRole("note")).toHaveTextContent("No ski day yet this season");
    expect(screen.getByRole("link", { name: "Open map" })).toHaveAttribute("href", "/map");
    rerender(<ProfileScreen account={{ ...incomplete, onboardingCompleted: true }} skiDays={[{ ...lastSeason, startedAt: "2026-10-05T09:00:00Z", endedAt: "2026-10-05T15:00:00Z" }]} today="2026-10-07" />);
    expect(screen.queryByRole("link", { name: "Open map" })).not.toBeInTheDocument();
  });

  it("shows the signed-in account and its region", () => {
    render(
      <ProfileScreen
        account={{ ...incomplete, displayName: "Lena Moser", handle: "lena_m", city: "salzburg", abilityLevel: "park", ridingStyles: ["park", "chill"], onboardingCompleted: true }}
        stats={{ rides: 3, resorts: 2, crew: 5 }}
      />,
    );

    expect(screen.getByText("Salzburg · Park · Chill")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("Stamps")).not.toBeInTheDocument();
    expect(screen.queryByText(/XP to level/)).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lena Moser");
    expect(screen.getByText("@lena_m")).toBeInTheDocument();
    expect(screen.getByText("LM")).toBeInTheDocument();
    expect(screen.getByText(`Season ${seasonLabel()} · Salzburg`, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Profile incomplete")).not.toBeInTheDocument();
  });

  it("shows one part at a time: season, rides or posts", () => {
    render(
      <ProfileScreen
        account={{ ...incomplete, displayName: "Lena Moser", handle: "lena_m", onboardingCompleted: true }}
        myRides={{ upcoming: [], past: [] }}
        myPosts={[]}
      />,
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rides" }));
    expect(screen.getByRole("note")).toHaveTextContent("No rides yet");
    fireEvent.click(screen.getByRole("button", { name: "Posts" }));
    expect(screen.getByRole("note")).toHaveTextContent("No posts yet");
    expect(screen.getByRole("link", { name: "Open Today" })).toHaveAttribute("href", "/feed");
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
