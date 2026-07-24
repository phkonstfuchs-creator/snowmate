import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAuthActionState } from "./action-state";
import {
  signInAction,
  signOutAction,
  signUpAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  getSupabasePublicConfig: vi.fn(() => ({
    url: "https://project-ref.supabase.co",
    publishableKey: "sb_publishable_test",
    siteUrl: "http://localhost:3000",
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfig: mocks.getSupabasePublicConfig,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([name, value]) => data.set(name, value));
  return data;
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth });
  });

  it("does not call Supabase when login input is invalid", async () => {
    const result = await signInAction(
      initialAuthActionState,
      formData({ email: "invalid", password: "" }),
    );

    expect(result.status).toBe("error");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("redirects to the feed after a valid login", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });

    await expect(
      signInAction(
        initialAuthActionState,
        formData({
          email: "rider@example.com",
          password: "existing-password",
        }),
      ),
    ).rejects.toThrow("redirect:/feed");

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "rider@example.com",
      password: "existing-password",
    });
  });

  it("does not reveal whether an account awaits confirmation", async () => {
    auth.signInWithPassword.mockResolvedValue({
      error: { code: "email_not_confirmed" },
    });

    const result = await signInAction(
      initialAuthActionState,
      formData({
        email: "rider@example.com",
        password: "existing-password",
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Email or password is incorrect.",
    });
  });

  it("returns a confirmation state when signup has no session", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await signUpAction(
      initialAuthActionState,
      formData({
        email: "new.rider@example.com",
        password: "Snowmate2026Pass",
        confirmPassword: "Snowmate2026Pass",
      }),
    );

    expect(result).toEqual({
      status: "success",
      message:
        "If this address can be used, you'll receive a confirmation email shortly.",
      email: "new.rider@example.com",
    });
  });

  it.each([
    "user_already_exists",
    "email_exists",
    "identity_already_exists",
  ])("does not reveal a signup enumeration error: %s", async (code) => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { code },
    });

    const result = await signUpAction(
      initialAuthActionState,
      formData({
        email: "known.rider@example.com",
        password: "Snowmate2026Pass",
        confirmPassword: "Snowmate2026Pass",
      }),
    );

    expect(result).toEqual({
      status: "success",
      message:
        "If this address can be used, you'll receive a confirmation email shortly.",
      email: "known.rider@example.com",
    });
  });

  it("signs out before redirecting to login", async () => {
    auth.signOut.mockResolvedValue({ error: null });

    await expect(signOutAction()).rejects.toThrow("redirect:/login");

    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("clears the local session when global signout fails", async () => {
    auth.signOut
      .mockResolvedValueOnce({ error: { code: "request_failed" } })
      .mockResolvedValueOnce({ error: null });

    await expect(signOutAction()).rejects.toThrow("redirect:/login");

    expect(auth.signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
  });
});
