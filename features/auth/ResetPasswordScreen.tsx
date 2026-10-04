"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useT } from "@/lib/i18n/client";
import AuthShell from "./AuthShell";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { updatePasswordAction } from "./actions";
import { initialAuthActionState } from "./action-state";

export default function ResetPasswordScreen() {
  const t = useT();
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialAuthActionState);

  return (
    <AuthShell eyebrow={t("auth.welcomeBack")} title={t("auth.resetTitle")} lead={t("auth.resetLead")}>
      {state.status === "success" ? (
        <div className="space-y-4">
          <p role="status" className="px-4 py-4 text-sm" style={{ border: "var(--rule-thick)", color: "var(--ink-1)" }}>{state.message}</p>
          <Link href="/feed" className="block py-3 text-center font-display uppercase" style={{ background: "var(--rust)", color: "var(--paper-0)" }}>
            {t("auth.toApp")}
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4" noValidate>
          <div>
            <Input label={t("auth.newPassword")} name="password" type="password" autoComplete="new-password"
              helper={t("auth.passwordHelper")} error={state.fieldErrors?.password?.[0]}
              value={password} onChange={(event) => setPassword(event.target.value)} required />
            <PasswordStrengthMeter password={password} />
          </div>
          <Input label={t("auth.confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password"
            error={state.fieldErrors?.confirmPassword?.[0]} required />
          {state.status === "error" && (
            <p role="alert" className="text-sm font-semibold" style={{ color: "var(--crimson)" }}>{state.message}</p>
          )}
          <Button type="submit" fullWidth disabled={pending} aria-busy={pending}>
            {pending ? t("common.saving") : t("auth.savePassword")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
