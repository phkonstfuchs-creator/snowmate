"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import { useT } from "@/lib/i18n/client";
import { updatePasswordAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/action-state";
import PasswordStrengthMeter from "@/features/auth/PasswordStrengthMeter";
import { confirmMfaAction, disableMfaAction, enrollMfaAction, type MfaEnrollment } from "./security-actions";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const PAPER_1 = "var(--paper-1)";

function CodeInput({ value, onChange, id }: { value: string; onChange: (value: string) => void; id: string }) {
  return (
    <input
      id={id}
      className="form-input text-center tracking-[0.4em]"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={7}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/[^0-9 ]/g, ""))}
      style={{ fontFamily: "var(--font-mono-stack)" }}
    />
  );
}

function TwoFactor({ enabled }: { enabled: boolean | null }) {
  const t = useT();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Extract<MfaEnrollment, { status: "ok" }> | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await enrollMfaAction();
      if (result.status === "ok") setEnrollment(result);
      else setMessage({ ok: false, text: result.message });
    });

  const confirm = () =>
    startTransition(async () => {
      if (!enrollment) return;
      const result = await confirmMfaAction(enrollment.factorId, code);
      setMessage({ ok: result.status === "ok", text: result.message });
      if (result.status === "ok") {
        setEnrollment(null);
        setCode("");
        router.refresh();
      }
    });

  const disable = () =>
    startTransition(async () => {
      const result = await disableMfaAction(code);
      setMessage({ ok: result.status === "ok", text: result.message });
      if (result.status === "ok") {
        setDisabling(false);
        setCode("");
        router.refresh();
      }
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: INK }}>{t("mfa.title")}</p>
          <p className="text-xs" style={{ color: INK_2 }}>
            {enabled === null ? t("mfa.unknown") : enabled ? t("mfa.on") : t("mfa.off")}
          </p>
        </div>
        {enabled === false && !enrollment && (
          <button type="button" onClick={start} disabled={pending} className="text-mono-label min-h-11 px-3 disabled:opacity-50"
            style={{ border: "var(--rule-thin)", background: PAPER_1, color: INK }}>
            {t("mfa.setUp")}
          </button>
        )}
        {enabled === true && !disabling && (
          <button type="button" onClick={() => { setDisabling(true); setMessage(null); }} className="text-mono-label min-h-11 px-3"
            style={{ border: "var(--rule-thin)", background: PAPER_1, color: "var(--crimson)" }}>
            {t("mfa.turnOff")}
          </button>
        )}
      </div>

      {enrollment && (
        <div className="space-y-3 p-3" style={{ border: "var(--rule-thin)", background: PAPER_1 }}>
          <p className="text-sm" style={{ color: INK }}>{t("mfa.scan")}</p>
          {enrollment.qrCode && (
            <div className="flex justify-center bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- an inline SVG data URI from Supabase */}
              <img src={enrollment.qrCode} alt={t("mfa.qrAlt")} width={180} height={180} />
            </div>
          )}
          <p className="text-xs break-all" style={{ color: INK_2 }}>
            {t("mfa.secret")}: <span style={{ fontFamily: "var(--font-mono-stack)" }}>{enrollment.secret}</span>
          </p>
          <label htmlFor="mfa-enroll-code" className="text-mono-label block" style={{ color: INK }}>{t("mfa.enterCode")}</label>
          <CodeInput id="mfa-enroll-code" value={code} onChange={setCode} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEnrollment(null); setCode(""); }} className="text-mono-label min-h-11 flex-1"
              style={{ border: "var(--rule-thin)", color: INK }}>
              {t("common.cancel")}
            </button>
            <button type="button" onClick={confirm} disabled={pending || code.replace(/\s/g, "").length !== 6}
              className="text-mono-label min-h-11 flex-1 disabled:opacity-40" style={{ background: INK, color: "var(--paper-0)" }}>
              {t("mfa.activate")}
            </button>
          </div>
        </div>
      )}

      {disabling && (
        <div className="space-y-3 p-3" style={{ border: "var(--rule-thin)", background: PAPER_1 }}>
          <label htmlFor="mfa-disable-code" className="text-mono-label block" style={{ color: INK }}>{t("mfa.confirmOff")}</label>
          <CodeInput id="mfa-disable-code" value={code} onChange={setCode} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setDisabling(false); setCode(""); }} className="text-mono-label min-h-11 flex-1"
              style={{ border: "var(--rule-thin)", color: INK }}>
              {t("common.cancel")}
            </button>
            <button type="button" onClick={disable} disabled={pending || code.replace(/\s/g, "").length !== 6}
              className="text-mono-label min-h-11 flex-1 disabled:opacity-40" style={{ background: "var(--crimson)", color: "var(--paper-0)" }}>
              {t("mfa.turnOff")}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm" style={{ color: message.ok ? "var(--pine)" : "var(--crimson)" }}>{message.text}</p>
      )}
    </div>
  );
}

function ChangePassword() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialAuthActionState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-mono-label min-h-11 w-full"
        style={{ border: "var(--rule-thin)", background: PAPER_1, color: INK }}>
        {t("auth.changePassword")}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <div>
        <Input label={t("auth.newPassword")} name="password" type="password" autoComplete="new-password"
          helper={t("auth.passwordHelper")} error={state.fieldErrors?.password?.[0]}
          value={password} onChange={(event) => setPassword(event.target.value)} />
        <PasswordStrengthMeter password={password} />
      </div>
      <Input label={t("auth.confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword?.[0]} />
      {state.message && (
        <p role="status" className="text-sm" style={{ color: state.status === "success" ? "var(--pine)" : "var(--crimson)" }}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="text-mono-label min-h-11 w-full disabled:opacity-50"
        style={{ background: INK, color: "var(--paper-0)" }}>
        {pending ? t("common.saving") : t("auth.savePassword")}
      </button>
    </form>
  );
}

export default function SecuritySection({ mfaEnabled }: { mfaEnabled: boolean | null }) {
  const t = useT();
  return (
    <section className="px-4 pb-4" aria-labelledby="security-title">
      <div className="section-rule">
        <h2 id="security-title" className="text-mono-label" style={{ color: INK }}>{t("profile.security")}</h2>
      </div>
      <div className="mt-3 space-y-4">
        <TwoFactor enabled={mfaEnabled} />
        <ChangePassword />
      </div>
    </section>
  );
}
