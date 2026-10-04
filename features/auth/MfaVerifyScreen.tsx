"use client";

import { useActionState, useState } from "react";
import Button from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";
import AuthShell from "./AuthShell";
import { signOutAction, verifyLoginMfaAction } from "./actions";
import { initialAuthActionState } from "./action-state";

export default function MfaVerifyScreen() {
  const t = useT();
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(verifyLoginMfaAction, initialAuthActionState);

  return (
    <AuthShell eyebrow={t("mfa.title")} title={t("mfa.verifyTitle")} lead={t("mfa.verifyLead")}>
      <form action={formAction} className="space-y-4" noValidate>
        <label htmlFor="login-mfa-code" className="text-mono-label block" style={{ color: "var(--ink-0)" }}>
          {t("mfa.enterCode")}
        </label>
        <input
          id="login-mfa-code"
          name="code"
          className="form-input text-center tracking-[0.4em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={7}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9 ]/g, ""))}
          style={{ fontFamily: "var(--font-mono-stack)" }}
        />
        {state.status === "error" && (
          <p role="alert" className="text-sm font-semibold" style={{ color: "var(--crimson)" }}>{state.message}</p>
        )}
        <Button type="submit" fullWidth disabled={pending || code.replace(/\s/g, "").length !== 6} aria-busy={pending}>
          {pending ? t("auth.signingIn") : t("mfa.verify")}
        </Button>
      </form>
      <form action={signOutAction} className="mt-4">
        <button type="submit" className="w-full py-3 text-sm font-semibold underline" style={{ color: "var(--ink-2)" }}>
          {t("mfa.useOtherAccount")}
        </button>
      </form>
    </AuthShell>
  );
}
