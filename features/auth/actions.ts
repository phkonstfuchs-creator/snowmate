"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { rateLimiter } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import type { AuthActionState, HandleCheck } from "./action-state";
import {
  parseEmailCode,
  parseOtpCode,
  validateEmailOnly,
  validateLoginCredentials,
  validateNewPassword,
  validateSignupCredentials,
} from "./credentials";
import { toSignupMetadata, validateSignupProfile, viennaToday } from "./signup-profile";
import { getT } from "@/lib/i18n/server";
import { TERMS_VERSION } from "@/features/legal/terms";
import { cookies } from "next/headers";
import { PENDING_SIGNUP_COOKIE, pendingSignupCookieOptions } from "./pending-signup";
import { getPendingSignupEmail } from "./queries";
import { translateFieldErrors, type MessageKey, type Translate } from "@/lib/i18n/translate";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function invalidState(
  t: Translate,
  email: string,
  fieldErrors: NonNullable<AuthActionState["fieldErrors"]>,
): AuthActionState {
  return {
    status: "error",
    message: t("v.checkFields"),
    email,
    fieldErrors: translateFieldErrors(t, fieldErrors),
  };
}

function isExistingAccountError(code: string | undefined): boolean {
  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    code === "identity_already_exists"
  );
}

/* Refusals a person can act on get their own message. Existence of an
   account is never revealed (handled above as "confirmation pending"). */
const SIGN_UP_ERROR_MESSAGES: Record<string, MessageKey> = {
  over_email_send_rate_limit: "auth.emailRateLimit",
  over_request_rate_limit: "auth.requestRateLimit",
  weak_password: "auth.weakPassword",
  email_address_invalid: "auth.emailRefused",
  email_address_not_authorized: "auth.emailRefused",
  signup_disabled: "auth.signUpClosed",
  email_provider_disabled: "auth.signUpClosed",
};

function signUpErrorMessage(t: Translate, code: string | undefined): string {
  return t((code && SIGN_UP_ERROR_MESSAGES[code]) || "auth.signUpFailed");
}

async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("base64url").slice(0, 24);
}

/* An account with a verified second factor gets an aal1 session from
   the password alone; it must pass /login/verify before anything else. */
async function needsSecondFactor(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) throw new Error("Assurance verification unavailable");
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = {
    email: stringField(formData, "email"),
    password: stringField(formData, "password"),
  };
  const validation = validateLoginCredentials(input);
  const t = await getT();

  if (!validation.success) {
    return invalidState(t, input.email, validation.fieldErrors);
  }

  const ip = await getRequestIp();
  const accountKey = await hashKey(`${ip}|${validation.data.email}`);
  if (!rateLimiter.hit("loginIp", ip) || !rateLimiter.hit("loginAccount", accountKey)) {
    return { status: "error", message: t("auth.tooManyAttempts"), email: validation.data.email };
  }

  const supabase = await createClient();
  let secondFactor = false;

  try {
    const { error } = await supabase.auth.signInWithPassword(validation.data);

    if (error) {
      return {
        status: "error",
        message: t("auth.wrongCredentials"),
        email: validation.data.email,
      };
    }

    rateLimiter.reset("loginAccount", accountKey);
    secondFactor = await needsSecondFactor(supabase);
  } catch {
    return {
      status: "error",
      message: t("auth.signInUnavailable"),
      email: validation.data.email,
    };
  }

  redirect(secondFactor ? "/login/verify" : "/feed");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = {
    email: stringField(formData, "email"),
    password: stringField(formData, "password"),
    confirmPassword: formData.has("confirmPassword") ? stringField(formData, "confirmPassword") : undefined,
  };
  const profileInput = {
    displayName: stringField(formData, "displayName"),
    handle: stringField(formData, "handle"),
    city: stringField(formData, "city"),
    ridingStyles: formData.getAll("ridingStyles").filter((value): value is string => typeof value === "string"),
    birthDate: stringField(formData, "birthDate"),
  };
  const acceptedTerms = stringField(formData, "acceptTerms") === TERMS_VERSION;
  const t = await getT();

  if (!acceptedTerms) {
    return { status: "error", message: t("auth.acceptTerms"), email: input.email };
  }

  const validation = validateSignupCredentials(input);
  const profile = validateSignupProfile(profileInput, viennaToday());

  if (!validation.success || !profile.success) {
    return {
      status: "error",
      message: t("v.checkFields"),
      email: input.email,
      fieldErrors: validation.success ? undefined : translateFieldErrors(t, validation.fieldErrors),
      profileErrors: profile.success ? undefined : translateFieldErrors(t, profile.fieldErrors),
    };
  }

  const ip = await getRequestIp();
  if (!rateLimiter.hit("signupIp", ip)) {
    return { status: "error", message: t("auth.tooManyAttempts"), email: validation.data.email };
  }

  const supabase = await createClient();
  let signedIn = false;

  try {
    const { data: available, error: handleError } = await supabase.rpc("handle_available", {
      candidate: profile.data.handle,
    });
    if (!handleError && available === false) {
      return {
        status: "error",
        message: t("v.checkFields"),
        email: validation.data.email,
        profileErrors: { handle: t("v.handleTaken") },
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: new URL("/auth/confirm", getSiteUrl()).toString(),
        data: { ...toSignupMetadata(profile.data), terms_version: TERMS_VERSION },
      },
    });

    if (error && !isExistingAccountError(error.code)) {
      /* The code only, never the email or password: enough to see in the
         server log why Supabase refused (rate limit, auth settings). */
      console.error("[auth] sign-up refused by Supabase:", error.code ?? error.status ?? "unknown");

      return {
        status: "error",
        message: signUpErrorMessage(t, error.code),
        email: validation.data.email,
      };
    }

    signedIn = Boolean(data?.session) && !error;
  } catch {
    return {
      status: "error",
      message: t("auth.signUpUnavailable"),
      email: validation.data.email,
    };
  }

  if (signedIn) redirect("/feed");

  /* New or already registered: the same next screen either way, so the
     form never tells whether an address has an account. */
  (await cookies()).set(
    PENDING_SIGNUP_COOKIE,
    validation.data.email,
    pendingSignupCookieOptions(process.env.NODE_ENV === "production"),
  );
  redirect("/signup/verify");
}

/* The code from the confirmation email. */
export async function verifySignupCodeAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getT();
  const email = await getPendingSignupEmail();
  if (!email) {
    return { status: "error", message: t("signupCode.expiredSession") };
  }
  const code = parseEmailCode(stringField(formData, "code"));
  if (!code) {
    return { status: "error", message: t("signupCode.format") };
  }

  const ip = await getRequestIp();
  if (!rateLimiter.hit("signupCodeIp", ip) || !rateLimiter.hit("signupCodeEmail", email.toLowerCase())) {
    return { status: "error", message: t("auth.tooManyAttempts") };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error || !data.session) {
      return { status: "error", message: t("signupCode.wrong") };
    }
  } catch {
    return { status: "error", message: t("auth.signUpUnavailable") };
  }

  rateLimiter.reset("signupCodeEmail", email.toLowerCase());
  (await cookies()).delete(PENDING_SIGNUP_COOKIE);
  redirect("/feed");
}

/* Sends the confirmation email again. Always answers the same way. */
export async function resendSignupCodeAction(): Promise<AuthActionState> {
  const t = await getT();
  const email = await getPendingSignupEmail();
  if (!email) {
    return { status: "error", message: t("signupCode.expiredSession") };
  }
  if (!rateLimiter.hit("signupResendIp", await getRequestIp())) {
    return { status: "error", message: t("auth.tooManyAttempts") };
  }
  if (!rateLimiter.hit("signupResendTarget", await hashKey(email.toLowerCase()))) {
    return { status: "success", message: t("signupCode.resent") };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: new URL("/auth/confirm", getSiteUrl()).toString() },
    });
    if (error) {
      console.error("[auth] resend refused by Supabase:", error.code ?? error.status ?? "unknown");
    }
  } catch {
    /* Same answer: nothing about the address is revealed. */
  }

  return { status: "success", message: t("signupCode.resent") };
}

/* Live feedback while typing a handle in the onboarding. */
export async function checkHandleAction(candidate: string): Promise<HandleCheck> {
  if (typeof candidate !== "string" || !/^[a-z0-9_]{3,20}$/.test(candidate.trim().toLowerCase())) {
    return "invalid";
  }
  if (!rateLimiter.hit("handleCheckIp", await getRequestIp())) return "unknown";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("handle_available", { candidate });
    if (error || typeof data !== "boolean") return "unknown";
    return data ? "available" : "taken";
  } catch {
    return "unknown";
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  /* End location announcements while the authenticated session is valid. */
  try {
    await supabase.rpc("stop_my_lift_meetup");
    await supabase.rpc("stop_sharing_location");
  } catch {
    // Expiry still bounds a status when the backend cannot be reached.
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Redirecting to login still leaves protected routes fail-closed.
    }
  }

  redirect("/login");
}

/* Always answers the same, whether or not the address has an account. */
export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getT();
  const email = stringField(formData, "email");
  const validation = validateEmailOnly({ email });

  if (!validation.success) {
    return invalidState(t, email, validation.fieldErrors);
  }

  if (!rateLimiter.hit("passwordResetIp", await getRequestIp())) {
    return { status: "error", message: t("auth.tooManyAttempts"), email };
  }
  if (!rateLimiter.hit("passwordResetTarget", await hashKey(validation.data.email.toLowerCase()))) {
    return { status: "success", message: t("auth.resetSent"), email: validation.data.email };
  }

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(validation.data.email, {
      redirectTo: new URL("/auth/confirm?next=/reset-password", getSiteUrl()).toString(),
    });
  } catch {
    return { status: "error", message: t("auth.signInUnavailable"), email };
  }

  return { status: "success", message: t("auth.resetSent"), email: validation.data.email };
}

/* Sets a new password for the signed-in account: after a reset link, or
   from the Profile tab. */
export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getT();
  const validation = validateNewPassword({
    password: stringField(formData, "password"),
    confirmPassword: stringField(formData, "confirmPassword"),
  });

  if (!validation.success) {
    return invalidState(t, "", validation.fieldErrors);
  }

  try {
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();
    const userId = userError ? null : data?.user?.id;
    if (!userId) return { status: "error", message: t("profile.sessionEnded") };
    if (!rateLimiter.hit("passwordChangeUser", userId)) {
      return { status: "error", message: t("auth.tooManyAttempts") };
    }
    const { error } = await supabase.auth.updateUser({ password: validation.data.password });
    if (error) {
      const key: MessageKey =
        error.code === "same_password"
          ? "auth.samePassword"
          : error.code === "weak_password"
            ? "auth.weakPassword"
            : error.code === "insufficient_aal"
              ? "mfa.required"
              : "auth.passwordChangeFailed";
      return { status: "error", message: t(key) };
    }
    const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
    if (revokeError) return { status: "error", message: t("auth.passwordChangeFailed") };
  } catch {
    return { status: "error", message: t("auth.passwordChangeFailed") };
  }

  return { status: "success", message: t("auth.passwordChanged") };
}

/* Second step of signing in when the account has 2FA. */
export async function verifyLoginMfaAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getT();
  const code = parseOtpCode(stringField(formData, "code"));
  if (!code) {
    return { status: "error", message: t("mfa.codeFormat") };
  }

  try {
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();
    const userId = userError ? null : data?.user?.id;
    if (!userId) redirect("/login");
    if (!rateLimiter.hit("mfaUser", userId)) {
      return { status: "error", message: t("auth.tooManyAttempts") };
    }
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError || !factors) throw new Error("Factor verification unavailable");
    const factor = factors?.totp.find((item) => item.status === "verified");
    if (!factor) {
      redirect("/feed");
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) {
      return { status: "error", message: t("mfa.wrongCode") };
    }
    rateLimiter.reset("mfaUser", userId);
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { status: "error", message: t("auth.signInUnavailable") };
  }

  redirect("/feed");
}

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
