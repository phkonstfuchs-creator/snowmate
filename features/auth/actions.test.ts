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

function signupFormData(email = "new.rider@example.com"): FormData {
  return formData({
    email,
    password: "Pistl2026Pass",
    confirmPassword: "Pistl2026Pass",
    inviteToken: "invite-token-00000000000000000001",
    birthDate: "2000-01-01",
    termsAccepted: "on",
    privacyAccepted: "on",
  });
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
      message: "E-Mail-Adresse oder Passwort ist falsch.",
    });
  });

  it("returns a confirmation state when signup has no session", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await signUpAction(
      initialAuthActionState,
      signupFormData(),
    );

    expect(result).toEqual({
      status: "success",
      message:
        "Wenn diese Adresse verwendet werden kann, erhältst du in Kürze eine Bestätigungs-E-Mail.",
      email: "new.rider@example.com",
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "new.rider@example.com",
      password: "Pistl2026Pass",
      options: {
        data: {
          invite_token: "invite-token-00000000000000000001",
          birth_date: "2000-01-01",
          terms_version: "terms-beta-2026-08-03",
          privacy_version: "privacy-beta-2026-08-03",
        },
        emailRedirectTo: "http://localhost:3000/auth/confirm",
      },
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
      signupFormData("known.rider@example.com"),
    );

    expect(result).toEqual({
      status: "success",
      message:
        "Wenn diese Adresse verwendet werden kann, erhältst du in Kürze eine Bestätigungs-E-Mail.",
      email: "known.rider@example.com",
    });
  });

  it("does not contact Supabase when invitation, age, or legal fields are missing", async () => {
    const result = await signUpAction(
      initialAuthActionState,
      formData({
        email: "new.rider@example.com",
        password: "Pistl2026Pass",
        confirmPassword: "Pistl2026Pass",
      }),
    );

    expect(result.status).toBe("error");
    expect(auth.signUp).not.toHaveBeenCalled();
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
