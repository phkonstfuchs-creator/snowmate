import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_DRAFT_KEY } from "@/features/profile/profile-input";
import SignOutForm from "./SignOutForm";

const mocks = vi.hoisted(() => ({
  removePush: vi.fn(), clearTrack: vi.fn(), signOut: vi.fn(), order: [] as string[],
}));
vi.mock("./remove-on-sign-out", () => ({ removePushOnSignOut: mocks.removePush }));
vi.mock("@/features/tracking/useSkiDayTracker", () => ({ clearStoredSkiDay: mocks.clearTrack }));
vi.mock("@/features/auth/actions", () => ({ signOutAction: mocks.signOut }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.order.length = 0;
  mocks.clearTrack.mockImplementation(() => mocks.order.push("track"));
  mocks.removePush.mockImplementation(async () => { mocks.order.push("push"); });
  mocks.signOut.mockImplementation(async () => { mocks.order.push("signOut"); });
});

describe("SignOutForm", () => {
  it("clears local GPS, removes this device's push and then ends the session", async () => {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ displayName: "Private name" }));
    render(<SignOutForm><button type="submit">Sign out</button></SignOutForm>);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.order).toEqual(["track", "push", "signOut"]);
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).toBeNull();
  });

  it("still ends the session if the browser push API fails", async () => {
    mocks.removePush.mockRejectedValueOnce(new Error("push unavailable"));
    render(<SignOutForm><button type="submit">Sign out</button></SignOutForm>);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.clearTrack).toHaveBeenCalledOnce();
  });
});
