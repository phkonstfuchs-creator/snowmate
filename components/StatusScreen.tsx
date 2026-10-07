"use client";

import Link from "next/link";
import Wordmark from "@/components/ui/Wordmark";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";

/* Full-screen message for a missing page or a crash: one sentence and
   one big way out, instead of the framework's bare error page. */
export default function StatusScreen({
  title,
  text,
  onRetry,
}: {
  title: MessageKey;
  text: MessageKey;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: "var(--paper-0)" }}>
      <Wordmark size={34} />
      <h1 className="mt-4 text-display-md" style={{ color: "var(--ink-0)" }}>{t(title)}</h1>
      <p className="max-w-xs text-sm" style={{ color: "var(--ink-2)" }}>{t(text)}</p>
      <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
        {onRetry && (
          <button type="button" onClick={onRetry} className="flex min-h-12 items-center justify-center text-sm font-semibold"
            style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 14 }}>
            {t("status.retry")}
          </button>
        )}
        <Link href="/" className="flex min-h-12 items-center justify-center text-sm font-semibold"
          style={onRetry ? { color: "var(--ink-1)" } : { background: "var(--rust)", color: "var(--on-accent)", borderRadius: 14 }}>
          {t("status.home")}
        </Link>
      </div>
    </main>
  );
}
