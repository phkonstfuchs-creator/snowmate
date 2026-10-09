"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Input from "@/components/ui/Input";
import { PROFILE_DRAFT_KEY } from "@/features/profile/draft-storage";
import { initialAuthActionState } from "./action-state";
import { signInAction, signUpAction } from "./actions";

interface AuthFormProps {
  mode: "login" | "signup";
  initialInviteToken?: string;
}

export default function AuthForm({
  mode,
  initialInviteToken = "",
}: AuthFormProps) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialAuthActionState,
  );
  const isSignup = mode === "signup";

  const emailRef = useRef<HTMLInputElement>(null);
  const inviteTokenRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (mode === "login") {
      window.sessionStorage.removeItem(PROFILE_DRAFT_KEY);
      window.localStorage.removeItem(PROFILE_DRAFT_KEY);
    }
  }, [mode]);

  useEffect(() => {
    if (state.status !== "error" || isPending) return;

    const firstInvalidField = state.fieldErrors?.inviteToken
      ? inviteTokenRef.current
      : state.fieldErrors?.email
        ? emailRef.current
        : state.fieldErrors?.birthDate
          ? birthDateRef.current
      : state.fieldErrors?.password
        ? passwordRef.current
        : state.fieldErrors?.confirmPassword
          ? confirmPasswordRef.current
          : state.fieldErrors?.termsAccepted
            ? termsRef.current
            : state.fieldErrors?.privacyAccepted
              ? privacyRef.current
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
              Anfrage erhalten
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
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {isSignup ? (
        <Input
          ref={inviteTokenRef}
          label="Einladungscode"
          name="inviteToken"
          autoComplete="off"
          defaultValue={initialInviteToken}
          error={state.fieldErrors?.inviteToken?.[0]}
          disabled={isPending}
          required
        />
      ) : null}
      <Input
        ref={emailRef}
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.email}
        error={state.fieldErrors?.email?.[0]}
        disabled={isPending}
        required
      />
      {isSignup ? (
        <Input
          ref={birthDateRef}
          label="Geburtsdatum"
          name="birthDate"
          type="date"
          autoComplete="bday"
          error={state.fieldErrors?.birthDate?.[0]}
          disabled={isPending}
          required
        />
      ) : null}
      <Input
        ref={passwordRef}
        label="Passwort"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        helper={
          isSignup
            ? "Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben und einer Zahl"
            : undefined
        }
        error={state.fieldErrors?.password?.[0]}
        disabled={isPending}
        required
      />
      {isSignup ? (
        <Input
          ref={confirmPasswordRef}
          label="Passwort bestätigen"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword?.[0]}
          disabled={isPending}
          required
        />
      ) : null}

      {isSignup ? (
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex items-start gap-3">
              <input
                ref={termsRef}
                id="termsAccepted"
                name="termsAccepted"
                type="checkbox"
                aria-label="Nutzungsbedingungen akzeptieren"
                aria-invalid={state.fieldErrors?.termsAccepted ? true : undefined}
                aria-describedby={
                  state.fieldErrors?.termsAccepted ? "terms-error" : undefined
                }
                disabled={isPending}
                required
                className="mt-1 h-5 w-5 flex-shrink-0 accent-[var(--pine)]"
              />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-1)" }}>
                Ich akzeptiere die{" "}
                <Link
                  href="/legal/nutzungsbedingungen"
                  className="font-semibold underline"
                  style={{ color: "var(--rust)" }}
                >
                  Nutzungsbedingungen
                </Link>
                .
              </p>
            </div>
            {state.fieldErrors?.termsAccepted?.[0] ? (
              <p id="terms-error" role="alert" className="mt-1 text-sm" style={{ color: "var(--crimson)" }}>
                {state.fieldErrors.termsAccepted[0]}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-start gap-3">
              <input
                ref={privacyRef}
                id="privacyAccepted"
                name="privacyAccepted"
                type="checkbox"
                aria-label="Datenschutzerklärung gelesen"
                aria-invalid={state.fieldErrors?.privacyAccepted ? true : undefined}
                aria-describedby={
                  state.fieldErrors?.privacyAccepted ? "privacy-error" : undefined
                }
                disabled={isPending}
                required
                className="mt-1 h-5 w-5 flex-shrink-0 accent-[var(--pine)]"
              />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-1)" }}>
                Ich habe die{" "}
                <Link
                  href="/legal/datenschutz"
                  className="font-semibold underline"
                  style={{ color: "var(--rust)" }}
                >
                  Datenschutzerklärung
                </Link>{" "}
                gelesen.
              </p>
            </div>
            {state.fieldErrors?.privacyAccepted?.[0] ? (
              <p id="privacy-error" role="alert" className="mt-1 text-sm" style={{ color: "var(--crimson)" }}>
                {state.fieldErrors.privacyAccepted[0]}
              </p>
            ) : null}
          </div>
        </div>
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
          size="lg"
          fullWidth
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending
            ? isSignup
              ? "Wird erstellt…"
              : "Wird angemeldet…"
            : isSignup
              ? "Account erstellen"
              : "Anmelden"}
        </Button>
      </div>

      <p className="text-center text-sm" style={{ color: "var(--ink-2)" }}>
        {isSignup ? "Schon dabei?" : "Noch keinen Account?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-semibold underline"
          style={{ color: "var(--rust)" }}
        >
          {isSignup ? "Anmelden" : "Registrieren"}
        </Link>
      </p>
    </form>
  );
}
