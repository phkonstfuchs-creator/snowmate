"use server";

import { redirect } from "next/navigation";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "./action-state";
import {
  validateLoginCredentials,
  validateSignupCredentials,
} from "./credentials";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function invalidState(
  email: string,
  fieldErrors: NonNullable<AuthActionState["fieldErrors"]>,
): AuthActionState {
  return {
    status: "error",
    message: "Check the highlighted fields.",
    email,
    fieldErrors,
  };
}

function confirmationPendingState(email: string): AuthActionState {
  return {
    status: "success",
    message:
      "If this address can be used, you will receive a confirmation email shortly.",
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
const SIGN_UP_ERROR_MESSAGES: Record<string, string> = {
  over_email_send_rate_limit:
    "Too many sign-up emails were sent in a short time. Wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Wait a few minutes and try again.",
  weak_password: "Choose a stronger password. Common or leaked passwords are refused.",
  email_address_invalid: "This email address cannot be used. Try another one.",
  email_address_not_authorized: "This email address cannot be used. Try another one.",
  signup_disabled: "Sign-up is closed right now.",
  email_provider_disabled: "Sign-up is closed right now.",
};

function signUpErrorMessage(code: string | undefined): string {
  return (
    (code && SIGN_UP_ERROR_MESSAGES[code]) ??
    "We could not create the account. Check the details and try again."
  );
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

  if (!validation.success) {
    return invalidState(input.email, validation.fieldErrors);
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword(validation.data);

    if (error) {
      return {
        status: "error",
        message: "Email or password is incorrect.",
        email: validation.data.email,
      };
    }
  } catch {
    return {
      status: "error",
      message: "Sign in is temporarily unavailable. Try again shortly.",
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

  if (!validation.success) {
    return invalidState(input.email, validation.fieldErrors);
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
        return confirmationPendingState(validation.data.email);
      }

      /* The code only, never the email or password: enough to see in the
         server log why Supabase refused (rate limit, auth settings). */
      console.error("[auth] sign-up refused by Supabase:", error.code ?? error.status ?? "unknown");

      return {
        status: "error",
        message: signUpErrorMessage(error.code),
        email: validation.data.email,
      };
    }

    if (!data.session) {
      return confirmationPendingState(validation.data.email);
    }
  } catch {
    return {
      status: "error",
      message: "Sign up is temporarily unavailable. Try again shortly.",
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
