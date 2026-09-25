import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingDraftSync from "./OnboardingDraftSync";
import { ONBOARDING_DRAFT_KEY } from "./profile-input";

const mocks = vi.hoisted(() => ({
  adopt: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("./actions", () => ({ adoptOnboardingDraftAction: mocks.adopt }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

const draft = { city: "innsbruck", style: "park", displayName: "Lena", handle: "lena" };

describe("OnboardingDraftSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("does nothing without a draft", () => {
    render(<OnboardingDraftSync />);
    expect(mocks.adopt).not.toHaveBeenCalled();
  });

  it("adopts the draft, clears it and refreshes", async () => {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
    mocks.adopt.mockResolvedValue("saved");

    render(<OnboardingDraftSync />);

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.adopt).toHaveBeenCalledWith(draft);
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).toBeNull();
  });

  it("keeps the draft when the handle is taken", async () => {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
    mocks.adopt.mockResolvedValue("handle_taken");

    render(<OnboardingDraftSync />);

    await waitFor(() => expect(mocks.adopt).toHaveBeenCalled());
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).not.toBeNull();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("keeps the draft when the request fails", async () => {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
    mocks.adopt.mockRejectedValue(new Error("offline"));

    render(<OnboardingDraftSync />);

    await waitFor(() => expect(mocks.adopt).toHaveBeenCalled());
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).not.toBeNull();
  });

  it("drops a corrupt draft", () => {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, "{not json");
    render(<OnboardingDraftSync />);
    expect(mocks.adopt).not.toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).toBeNull();
  });
});
