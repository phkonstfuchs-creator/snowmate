"use client";

import { useActionState } from "react";
import { setBirthDateAction } from "./actions";
import { initialProfileActionState } from "./action-state";
import { useT } from "@/lib/i18n/client";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";

/* Asks once for the birth date. The database derives "18+" from it and
   refuses later changes, so the form disappears after saving. */
export default function AgeSection({ birthDate, isMinor }: { birthDate: string | null; isMinor: boolean }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(setBirthDateAction, initialProfileActionState);

  return (
    <section className="px-4 pb-4" aria-labelledby="age-title">
      <div className="section-rule">
        <h2 id="age-title" className="text-mono-label" style={{ color: INK }}>{t("profile.age")}</h2>
      </div>

      {birthDate ? (
        <p className="mt-2 text-sm" style={{ color: INK }}>
          {isMinor ? t("profile.ageMinor") : t("profile.ageAdult")}
        </p>
      ) : (
        <form action={formAction} className="mt-2 space-y-2">
          <p className="text-sm leading-relaxed" style={{ color: INK_2 }}>{t("profile.ageHint")}</p>
          <label htmlFor="birth-date" className="text-mono-label block" style={{ color: INK }}>
            {t("profile.birthDate")}
          </label>
          <div className="flex gap-2">
            <input id="birth-date" name="birthDate" type="date" required className="form-input flex-1" autoComplete="bday" />
            <button
              type="submit"
              disabled={pending}
              className="px-4 font-display uppercase disabled:opacity-40"
              style={{ background: INK, color: "var(--paper-0)", border: "var(--rule-thick)" }}
            >
              {pending ? t("common.saving") : t("common.save")}
            </button>
          </div>
          <p className="text-xs" style={{ color: INK_2 }}>{t("profile.ageOnce")}</p>
          <p role="status" aria-live="polite" className="min-h-5 text-sm" style={{ color: state.status === "error" ? "var(--crimson)" : INK }}>
            {state.message}
          </p>
        </form>
      )}
    </section>
  );
}
