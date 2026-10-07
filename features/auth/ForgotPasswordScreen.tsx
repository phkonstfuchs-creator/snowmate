"use client";

import Link from "next/link";
import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useT } from "@/lib/i18n/client";
import AuthShell from "./AuthShell";
import { requestPasswordResetAction } from "./actions";
import { initialAuthActionState } from "./action-state";

export default function ForgotPasswordScreen() {
  const t = useT();
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialAuthActionState);

  return (
    <AuthShell eyebrow={t("auth.welcomeBack")} title={t("auth.forgotTitle")} lead={t("auth.forgotLead")}>
      {state.status === "success" ? (
        <p role="status" className="px-4 py-4 text-sm leading-relaxed" style={{ border: "var(--rule-thick)", color: "var(--ink-1)" }}>
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="space-y-4" noValidate>
          <Input label={t("auth.email")} name="email" type="email" autoComplete="email" inputMode="email"
            defaultValue={state.email} error={state.fieldErrors?.email?.[0]} required />
          {state.status === "error" && (
            <p role="alert" className="text-sm font-semibold" style={{ color: "var(--crimson)" }}>{state.message}</p>
          )}
          <Button type="submit" fullWidth disabled={pending} aria-busy={pending}>
            {pending ? t("safety.sending") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}
      <Link href="/login" className="mt-5 flex min-h-11 items-center justify-center text-sm font-semibold underline" style={{ color: "var(--ink-1)" }}>
        {t("auth.backToSignIn")}
      </Link>
    </AuthShell>
  );
}
