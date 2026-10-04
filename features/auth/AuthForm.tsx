"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/ui/Input";
import { initialAuthActionState } from "./action-state";
import { signInAction, signUpAction } from "./actions";
import { useT } from "@/lib/i18n/client";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialAuthActionState,
  );
  const isSignup = mode === "signup";
  const t = useT();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status !== "error" || isPending) return;

    const firstInvalidField = state.fieldErrors?.email
      ? emailRef.current
      : state.fieldErrors?.password
        ? passwordRef.current
        : state.fieldErrors?.confirmPassword
          ? confirmPasswordRef.current
          : null;

    (firstInvalidField ?? errorSummaryRef.current)?.focus();
  }, [state, isPending]);

  if (state.status === "success") {
    return (
      <div aria-live="polite" className="space-y-5">
        <div
          className="flex items-start gap-3 px-4 py-4"
          style={{
            background: "var(--paper-1)",
            border: "var(--rule-thick)",
            boxShadow: "var(--shadow-print)",
          }}
        >
          <Icon
            name="mail-check"
            size={20}
            color="var(--rust)"
            className="mt-0.5 flex-shrink-0"
          />
          <div>
            <p className="text-mono-label" style={{ color: "var(--ink-0)" }}>
              {t("auth.requestReceived")}
            </p>
            <p
              className="mt-1.5 text-sm leading-relaxed"
              style={{ color: "var(--ink-1)" }}
            >
              {state.message}
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm font-semibold underline"
          style={{ color: "var(--ink-1)" }}
        >
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Input
        ref={emailRef}
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.email}
        error={state.fieldErrors?.email?.[0]}
        disabled={isPending}
        required
      />
      <Input
        ref={passwordRef}
        label={t("auth.password")}
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        helper={
          isSignup
            ? t("auth.passwordHelper")
            : undefined
        }
        error={state.fieldErrors?.password?.[0]}
        disabled={isPending}
        required
      />
      {!isSignup ? (
        <Link
          href="/forgot-password"
          className="-mt-2 block w-fit py-1 text-sm font-semibold underline"
          style={{ color: "var(--ink-2)" }}
        >
          {t("auth.forgotPassword")}
        </Link>
      ) : null}
      {isSignup ? (
        <Input
          ref={confirmPasswordRef}
          label={t("auth.confirmPassword")}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword?.[0]}
          disabled={isPending}
          required
        />
      ) : null}

      {state.status === "error" ? (
        <p
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="text-sm font-semibold outline-none"
          style={{ color: "var(--crimson)" }}
        >
          {state.message}
        </p>
      ) : null}

      <div className="pt-1">
        <Button
          type="submit"
          fullWidth
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending
            ? isSignup
              ? t("auth.creating")
              : t("auth.signingIn")
            : isSignup
              ? t("auth.createAccount")
              : t("auth.signIn")}
        </Button>
      </div>

      <p className="text-center text-sm" style={{ color: "var(--ink-2)" }}>
        {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="-my-2 inline-flex min-h-11 items-center px-1 font-semibold underline"
          style={{ color: "var(--rust)" }}
        >
          {isSignup ? t("auth.signIn") : t("auth.register")}
        </Link>
      </p>
    </form>
  );
}
