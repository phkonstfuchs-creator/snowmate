import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAuthActionState } from "./action-state";
import {
  checkHandleAction,
  requestPasswordResetAction,
  resendSignupCodeAction,
  signInAction,
  signOutAction,
  signUpAction,
  updatePasswordAction,
  verifyLoginMfaAction,
  verifySignupCodeAction,
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
  getSiteUrl: () => "http://localhost:3000",
}));

/* Every test is its own visitor, so the per-IP limits do not leak
   between tests; the limit tests below reuse one address on purpose. */
const ip = vi.hoisted(() => ({ next: 0, fixed: null as string | null }));
vi.mock("@/lib/request-ip", () => ({
  getRequestIp: async () => ip.fixed ?? `10.0.0.${++ip.next}`,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

/* The pending sign-up lives in an httpOnly cookie. */
const jar = vi.hoisted(() => new Map<string, { value: string; options?: Record<string, unknown> }>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => jar.get(name),
    set: (name: string, value: string, options?: Record<string, unknown>) => jar.set(name, { value, options }),
    delete: (name: string) => jar.delete(name),
  }),
}));

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  resend: vi.fn(),
  mfa: {
    getAuthenticatorAssuranceLevel: vi.fn(),
    listFactors: vi.fn(),
    challengeAndVerify: vi.fn(),
  },
};
const rpc = vi.fn();

/* The onboarding answers that travel with every sign-up. */
const PROFILE = {
  displayName: "New Rider",
  handle: "new_rider",
  city: "innsbruck",
  birthDate: "2004-02-14",
  acceptTerms: "2026-10-07",
};

function signupForm(values: Record<string, string>, styles: string[] = ["park", "chill"]): FormData {
  const fields = formData({ ...PROFILE, ...values });
  styles.forEach((style) => fields.append("ridingStyles", style));
  return fields;
}

function formData(values: Record<string, string>): FormData {
  const fields = new FormData();
  Object.entries(values).forEach(([name, value]) => fields.set(name, value));
  return fields;
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ip.fixed = null;
    mocks.createClient.mockResolvedValue({ auth, rpc });
    rpc.mockResolvedValue({ data: true, error: null });
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });
    auth.signOut.mockResolvedValue({ error: null });
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

  it("asks for the emailed code when signup has no session", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(signUpAction(
      initialAuthActionState,
      signupForm({
        email: "new.rider@example.com",
        password: "Pistl2026Pass",
        confirmPassword: "Pistl2026Pass",
      }),
    )).rejects.toThrow("redirect:/signup/verify");

    expect(jar.get("pistl_pending_signup")).toEqual({
      value: "new.rider@example.com",
      options: expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: 3600 }),
    });
  });

  it.each([
    ["over_email_send_rate_limit", "Too many sign-up emails were sent in a short time. Wait a few minutes and try again."],
    ["weak_password", "Choose a stronger password. Common or leaked passwords are refused."],
    ["something_else", "We could not create the account. Check the details and try again."],
    [undefined, "We could not create the account. Check the details and try again."],
  ])("explains the sign-up refusal %s and logs only its code", async (code, message) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    auth.signUp.mockResolvedValue({ data: { session: null }, error: { code } });

    const result = await signUpAction(
      initialAuthActionState,
      signupForm({
        email: "new.rider@example.com",
        password: "Pistl2026Pass",
        confirmPassword: "Pistl2026Pass",
      }),
    );

    expect(result).toMatchObject({ status: "error", message });
    expect(JSON.stringify(log.mock.calls)).not.toContain("new.rider@example.com");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Pistl2026Pass");
    log.mockRestore();
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

    /* Exactly the same next step as for a new address. */
    await expect(signUpAction(
      initialAuthActionState,
      signupForm({
        email: "known.rider@example.com",
        password: "Pistl2026Pass",
        confirmPassword: "Pistl2026Pass",
      }),
    )).rejects.toThrow("redirect:/signup/verify");
    expect(jar.get("pistl_pending_signup")?.value).toBe("known.rider@example.com");
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

  it("sends the onboarding answers with the account, after checking the handle", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

    await expect(signUpAction(
      initialAuthActionState,
      signupForm({ email: "new.rider@example.com", password: "Pistl2026Pass", confirmPassword: "Pistl2026Pass" }),
    )).rejects.toThrow("redirect:/signup/verify");

    expect(rpc).toHaveBeenCalledWith("handle_available", { candidate: "new_rider" });
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "new.rider@example.com",
      options: expect.objectContaining({
        emailRedirectTo: "http://localhost:3000/auth/confirm",
        data: {
          display_name: "New Rider",
          handle: "new_rider",
          city: "innsbruck",
          riding_styles: ["park", "chill"],
          birth_date: "2004-02-14",
          terms_version: "2026-10-07",
        },
      }),
    }));
  });

  it("creates nothing until the terms of use are accepted", async () => {
    const form = signupForm({ email: "new.rider@example.com", password: "Pistl2026Pass", confirmPassword: "Pistl2026Pass" });
    form.delete("acceptTerms");
    const result = await signUpAction(initialAuthActionState, form);
    expect(result).toMatchObject({ status: "error", message: "Please accept the terms of use." });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("stops at a taken handle before creating anything", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    const result = await signUpAction(
      initialAuthActionState,
      signupForm({ email: "new.rider@example.com", password: "Pistl2026Pass", confirmPassword: "Pistl2026Pass" }),
    );

    expect(result.profileErrors).toEqual({ handle: "That handle is taken." });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it.each([
    [{ birthDate: "2020-01-01" }, ["chill"], "birthDate", "Pistl is for riders aged 14 and over."],
    [{ birthDate: "not-a-date" }, ["chill"], "birthDate", "Enter a valid birth date."],
    [{}, [], "ridingStyles", "Pick a riding style."],
    [{ city: "vienna" }, ["chill"], "city", "Pick a region."],
    [{ handle: "a" }, ["chill"], "handle", "Use at least 3 characters."],
  ])("refuses invalid onboarding answers %j", async (override, styles, field, message) => {
    const result = await signUpAction(
      initialAuthActionState,
      signupForm({ email: "new.rider@example.com", password: "Pistl2026Pass", confirmPassword: "Pistl2026Pass", ...override }, styles),
    );

    expect(result.status).toBe("error");
    expect(result.profileErrors?.[field as keyof NonNullable<typeof result.profileErrors>]).toBe(message);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it.each([
    ["Password12345", "This password is too common. Choose something less guessable."],
    ["Newrider2026xyz", "Do not use your email address in the password."],
  ])("refuses the weak password %s", async (password, message) => {
    const result = await signUpAction(
      initialAuthActionState,
      signupForm({ email: "newrider@example.com", password, confirmPassword: password }),
    );

    expect(result.fieldErrors?.password).toEqual([message]);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("sends an account with two-factor sign-in to the code screen", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" } });

    await expect(
      signInAction(initialAuthActionState, formData({ email: "rider@example.com", password: "existing-password" })),
    ).rejects.toThrow("redirect:/login/verify");
  });

  it("limits password guessing on one account", async () => {
    ip.fixed = "203.0.113.7";
    auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    const attempt = () =>
      signInAction(initialAuthActionState, formData({ email: "target@example.com", password: "guess-password" }));

    for (let i = 0; i < 8; i += 1) {
      expect((await attempt()).message).toBe("Email or password is incorrect.");
    }
    expect((await attempt()).message).toBe("Too many attempts. Wait a few minutes and try again.");
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(8);
  });

  it("checks a handle only when it is well-formed", async () => {
    expect(await checkHandleAction("A!")).toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
    expect(await checkHandleAction("free_one")).toBe("available");
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await checkHandleAction("taken_one")).toBe("taken");
  });

  it("answers a reset request the same way whether or not the account exists", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const known = await requestPasswordResetAction(initialAuthActionState, formData({ email: "rider@example.com" }));
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { code: "user_not_found" } });
    const unknown = await requestPasswordResetAction(initialAuthActionState, formData({ email: "nobody@example.com" }));

    expect(known.message).toBe(unknown.message);
    expect(known.status).toBe("success");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("rider@example.com", {
      redirectTo: "http://localhost:3000/auth/confirm?next=/reset-password",
    });
  });

  it("changes the password only for a signed-in account and with a strong password", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } });
    const signedOut = await updatePasswordAction(initialAuthActionState, formData({ password: "Fresh-Powder-2026", confirmPassword: "Fresh-Powder-2026" }));
    expect(signedOut.message).toBe("Your session ended. Sign in again.");

    auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const weak = await updatePasswordAction(initialAuthActionState, formData({ password: "short", confirmPassword: "short" }));
    expect(weak.status).toBe("error");
    expect(auth.updateUser).not.toHaveBeenCalled();

    auth.updateUser.mockResolvedValue({ error: null });
    const ok = await updatePasswordAction(initialAuthActionState, formData({ password: "Fresh-Powder-2026", confirmPassword: "Fresh-Powder-2026" }));
    expect(ok).toMatchObject({ status: "success", message: "Password changed." });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "Fresh-Powder-2026" });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("handles a failed identity check without changing the password", async () => {
    auth.getUser.mockRejectedValueOnce(new Error("auth unavailable"));
    await expect(updatePasswordAction(initialAuthActionState, formData({
      password: "Fresh-Powder-2026", confirmPassword: "Fresh-Powder-2026",
    }))).resolves.toMatchObject({ status: "error" });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("does not open the app when the MFA factor lookup fails", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "mfa-failure" } } });
    auth.mfa.listFactors.mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    await expect(verifyLoginMfaAction(initialAuthActionState, formData({ code: "123456" })))
      .resolves.toMatchObject({ status: "error" });
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps reset provider cooldowns indistinguishable from an unknown account", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { code: "over_email_send_rate_limit" } });
    const throttled = await requestPasswordResetAction(initialAuthActionState, formData({ email: "cooldown@example.com" }));
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { code: "user_not_found" } });
    const unknown = await requestPasswordResetAction(initialAuthActionState, formData({ email: "missing-cooldown@example.com" }));
    expect(throttled.status).toBe("success");
    expect(throttled.message).toBe(unknown.message);
  });

  it("limits reset email delivery across different visitors without revealing the limit", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await requestPasswordResetAction(initialAuthActionState, formData({ email: "mail-quota@example.com" }));
      expect(result.status).toBe("success");
    }
    expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(3);
  });

  it("verifies the second factor before opening the app", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "user-2" } } });
    auth.mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] } });

    expect((await verifyLoginMfaAction(initialAuthActionState, formData({ code: "12" }))).message)
      .toBe("Enter the 6-digit code from your authenticator app.");

    auth.mfa.challengeAndVerify.mockResolvedValue({ error: { code: "mfa_verification_failed" } });
    expect((await verifyLoginMfaAction(initialAuthActionState, formData({ code: "123 456" }))).status).toBe("error");

    auth.mfa.challengeAndVerify.mockResolvedValue({ error: null });
    await expect(verifyLoginMfaAction(initialAuthActionState, formData({ code: "123456" }))).rejects.toThrow("redirect:/feed");
    expect(auth.mfa.challengeAndVerify).toHaveBeenLastCalledWith({ factorId: "factor-1", code: "123456" });
  });
});

describe("sign-up code", () => {
  beforeEach(() => {
    jar.clear();
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth, rpc });
  });

  function codeForm(code: string) {
    const data = new FormData();
    data.set("code", code);
    return data;
  }

  it("signs in with the emailed code and forgets the pending sign-up", async () => {
    jar.set("pistl_pending_signup", { value: "new.rider@example.com" });
    auth.verifyOtp.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });

    await expect(verifySignupCodeAction(initialAuthActionState, codeForm("123 456"))).rejects.toThrow("redirect:/feed");

    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "new.rider@example.com", token: "123456", type: "email" });
    expect(jar.has("pistl_pending_signup")).toBe(false);
  });

  it("refuses a wrong code without saying more", async () => {
    jar.set("pistl_pending_signup", { value: "new.rider@example.com" });
    auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: { code: "otp_expired" } });

    await expect(verifySignupCodeAction(initialAuthActionState, codeForm("654321"))).resolves.toMatchObject({
      status: "error",
      message: expect.stringContaining("wrong or has expired"),
    });
    expect(jar.has("pistl_pending_signup")).toBe(true);
  });

  it("checks the format before asking Supabase", async () => {
    jar.set("pistl_pending_signup", { value: "new.rider@example.com" });

    await expect(verifySignupCodeAction(initialAuthActionState, codeForm("12ab"))).resolves.toMatchObject({ status: "error" });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("needs a sign-up in progress", async () => {
    await expect(verifySignupCodeAction(initialAuthActionState, codeForm("123456"))).resolves.toMatchObject({
      status: "error",
      message: expect.stringContaining("expired"),
    });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("stops guessing after eight wrong codes for one address", async () => {
    jar.set("pistl_pending_signup", { value: "guessed@example.com" });
    auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: { code: "otp_expired" } });

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await verifySignupCodeAction(initialAuthActionState, codeForm("000000"));
    }
    await expect(verifySignupCodeAction(initialAuthActionState, codeForm("111111"))).resolves.toMatchObject({
      message: expect.stringContaining("Too many"),
    });
    expect(auth.verifyOtp).toHaveBeenCalledTimes(8);
  });

  it("sends a new code and answers the same either way", async () => {
    jar.set("pistl_pending_signup", { value: "new.rider@example.com" });
    auth.resend.mockResolvedValue({ error: null });

    await expect(resendSignupCodeAction()).resolves.toMatchObject({ status: "success" });
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "new.rider@example.com",
      options: { emailRedirectTo: "http://localhost:3000/auth/confirm" },
    });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    auth.resend.mockResolvedValue({ error: { code: "over_email_send_rate_limit" } });
    await expect(resendSignupCodeAction()).resolves.toMatchObject({ status: "success" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("new.rider@example.com");
    log.mockRestore();
  });

  it("cannot resend without a sign-up in progress", async () => {
    await expect(resendSignupCodeAction()).resolves.toMatchObject({ status: "error" });
    expect(auth.resend).not.toHaveBeenCalled();
  });
});
