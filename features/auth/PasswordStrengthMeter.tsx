"use client";

import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { passwordScore } from "./password-strength";

const LABELS: MessageKey[] = ["pw.veryWeak", "pw.weak", "pw.ok", "pw.good", "pw.strong"];
const COLORS = ["var(--crimson)", "var(--crimson)", "var(--ochre)", "var(--pine)", "var(--pine)"];

/* Live hint while typing; the server decides what is accepted. */
export default function PasswordStrengthMeter({ password, email = "" }: { password: string; email?: string }) {
  const t = useT();
  if (!password) return null;
  const score = passwordScore(password, email);

  return (
    <div className="mt-1.5" aria-live="polite">
      <div aria-hidden="true" className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-1.5 flex-1"
            style={{ background: index < Math.max(score, 1) ? COLORS[score] : "var(--paper-3)" }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs" style={{ color: COLORS[score] }}>
        {t("pw.strength")}: {t(LABELS[score] ?? "pw.veryWeak")}
      </p>
    </div>
  );
}
