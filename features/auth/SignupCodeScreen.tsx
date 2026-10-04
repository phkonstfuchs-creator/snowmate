"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Button from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";
import AuthShell from "./AuthShell";
import { resendSignupCodeAction, verifySignupCodeAction } from "./actions";
import { initialAuthActionState } from "./action-state";

export default function SignupCodeScreen({ maskedEmail }: { maskedEmail: string }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(verifySignupCodeAction, initialAuthActionState);
  const [resendState, resendAction, resending] = useActionState(resendSignupCodeAction, initialAuthActionState);
  const digits = code.replace(/\s/g, "").length;

  return (
    <AuthShell eyebrow={t("signupCode.eyebrow")} title={t("signupCode.title")} lead={t("signupCode.lead", { email: maskedEmail })}>
      <form action={formAction} className="space-y-4" noValidate>
        <label htmlFor="signup-code" className="text-mono-label block" style={{ color: "var(--ink-0)" }}>
          {t("signupCode.label")}
        </label>
        <input
          id="signup-code"
          name="code"
          className="form-input text-center tracking-[0.4em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={12}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9 ]/g, ""))}
          style={{ fontFamily: "var(--font-mono-stack)" }}
        />
        {state.status === "error" && (
          <p role="alert" className="text-sm font-semibold" style={{ color: "var(--crimson)" }}>{state.message}</p>
        )}
        <Button type="submit" fullWidth disabled={pending || digits < 6} aria-busy={pending}>
          {pending ? t("signupCode.checking") : t("signupCode.submit")}
        </Button>
      </form>

      <p className="mt-5 text-sm" style={{ color: "var(--ink-2)" }}>{t("signupCode.spamHint")}</p>
      <form action={resendAction} className="mt-2">
        <button type="submit" disabled={resending} className="w-full py-3 text-sm font-semibold underline disabled:opacity-50" style={{ color: "var(--ink-1)" }}>
          {t("signupCode.resend")}
        </button>
      </form>
      {resendState.status !== "idle" && (
        <p role="status" className="text-center text-sm" style={{ color: resendState.status === "error" ? "var(--crimson)" : "var(--ink-1)" }}>
          {resendState.message}
        </p>
      )}
      <Link href="/login" className="mt-4 block text-center text-sm font-semibold underline" style={{ color: "var(--ink-2)" }}>
        {t("auth.backToSignIn")}
      </Link>
    </AuthShell>
  );
}
