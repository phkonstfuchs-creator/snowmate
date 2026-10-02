"use server";

import { redirect } from "next/navigation";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "./action-state";
import {
  validateLoginCredentials,
  validateSignupCredentials,
} from "./credentials";
import { getT } from "@/lib/i18n/server";
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

function confirmationPendingState(t: Translate, email: string): AuthActionState {
  return {
    status: "success",
    message: t("auth.confirmationPending"),
    email,
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

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword(validation.data);

    if (error) {
      return {
        status: "error",
        message: t("auth.wrongCredentials"),
        email: validation.data.email,
      };
    }
  } catch {
    return {
      status: "error",
      message: t("auth.signInUnavailable"),
      email: validation.data.email,
    };
  }

  redirect("/feed");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = {
    email: stringField(formData, "email"),
    password: stringField(formData, "password"),
    confirmPassword: stringField(formData, "confirmPassword"),
  };
  const validation = validateSignupCredentials(input);
  const t = await getT();

  if (!validation.success) {
    return invalidState(t, input.email, validation.fieldErrors);
  }

  const supabase = await createClient();
  const { siteUrl } = getSupabasePublicConfig();

  try {
    const { data, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: new URL("/auth/confirm", siteUrl).toString(),
      },
    });

    if (error) {
      if (isExistingAccountError(error.code)) {
        return confirmationPendingState(t, validation.data.email);
      }

      /* The code only, never the email or password: enough to see in the
         server log why Supabase refused (rate limit, auth settings). */
      console.error("[auth] sign-up refused by Supabase:", error.code ?? error.status ?? "unknown");

      return {
        status: "error",
        message: signUpErrorMessage(t, error.code),
        email: validation.data.email,
      };
    }

    if (!data.session) {
      return confirmationPendingState(t, validation.data.email);
    }
  } catch {
    return {
      status: "error",
      message: t("auth.signUpUnavailable"),
      email: validation.data.email,
    };
  }

  redirect("/feed");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

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
