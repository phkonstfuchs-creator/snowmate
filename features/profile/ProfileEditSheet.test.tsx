import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileEditSheet from "./ProfileEditSheet";
import { ONBOARDING_DRAFT_KEY, type OwnProfile } from "./profile-input";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("./actions", () => ({ updateProfileAction: mocks.update }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

const complete: OwnProfile = {
  displayName: "Lena Moser",
  handle: "lena_m",
  city: "salzburg",
  abilityLevel: "off-piste",
  bio: "Dawn patrol",
  isMinor: true,
  onboardingCompleted: true,
};

describe("ProfileEditSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("prefills the saved profile", () => {
    render(<ProfileEditSheet profile={complete} onClose={() => {}} />);

    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Lena Moser");
    expect(screen.getByLabelText("Handle")).toHaveValue("lena_m");
    expect(screen.getByRole("radio", { name: "Salzburg" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Off-piste" })).toBeChecked();
  });

  it("prefills an incomplete profile from the onboarding draft", () => {
    localStorage.setItem(
      ONBOARDING_DRAFT_KEY,
      JSON.stringify({ displayName: "Max", handle: "max_r", city: "innsbruck", style: "park" }),
    );

    render(<ProfileEditSheet profile={null} onClose={() => {}} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Max");
    expect(screen.getByRole("radio", { name: "Innsbruck" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Park" })).toBeChecked();
  });

  it("shows field errors returned by the server", async () => {
    mocks.update.mockResolvedValue({
      status: "error",
      message: "That handle is taken.",
      fieldErrors: { handle: "That handle is taken." },
    });

    render(<ProfileEditSheet profile={complete} onClose={() => {}} />);
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
    });

    expect(await screen.findAllByText("That handle is taken.")).toHaveLength(2);
    expect(screen.getByLabelText("Handle")).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the draft, refreshes and closes after saving", async () => {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, "{}");
    mocks.update.mockResolvedValue({ status: "success", message: "Profile saved." });
    const onClose = vi.fn();

    render(<ProfileEditSheet profile={complete} onClose={onClose} />);
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.refresh).toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).toBeNull();
  });
});
