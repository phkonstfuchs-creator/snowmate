import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROFILE_DRAFT_KEY } from "./draft-storage";
import ProfileAccessActions from "./ProfileAccessActions";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  signOutAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/auth/actions", () => ({
  signOutAction: mocks.signOutAction,
}));

describe("ProfileAccessActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("retries the protected server render", () => {
    render(<ProfileAccessActions />);

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("clears an account draft before signing out", () => {
    sessionStorage.setItem(PROFILE_DRAFT_KEY, "previous account");
    render(<ProfileAccessActions showRetry={false} />);

    const form = screen.getByRole("button", { name: "Abmelden" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(sessionStorage.getItem(PROFILE_DRAFT_KEY)).toBeNull();
  });
});
