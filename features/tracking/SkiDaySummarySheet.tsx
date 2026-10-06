"use client";

import { useId, useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Icon from "@/components/ui/Icon";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/translate";
import { RESORTS } from "@/lib/resorts";
import PostComposer from "@/features/posts/PostComposer";
import { saveSkiDayAction } from "./actions";
import { formatDuration, formatKm, type SaveSkiDayOutcome } from "./ski-day";
import { isWorthSaving } from "./tracker";
import type { FinishedDay } from "./useSkiDayTracker";
import SkiDayStats from "./SkiDayStats";

const OUTCOME: Record<Exclude<SaveSkiDayOutcome, "saved">, MessageKey> = {
  invalid: "track.invalid",
  rate_limited: "track.rateLimited",
  unauthenticated: "profile.sessionEnded",
  unavailable: "track.failed",
};

/* After "finish": the day's numbers, then save (only the summary) and,
   if wanted, share it as a post with friends. */
export default function SkiDaySummarySheet({ day, onClose }: { day: FinishedDay; onClose: () => void }) {
  useScrollLock();
  const t = useT();
  const locale = INTL_LOCALE[useLocale()];
  const ids = useId();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const { summary, resort } = day;
  const worth = isWorthSaving(summary);
  const { state, dismiss } = useSheetDismiss(onClose);
  /* An unsaved day is gone once closed: ask first. */
  const close = () => {
    if (worth && !saved && !window.confirm(t("track.confirmDiscard"))) return;
    dismiss();
  };
  const panelRef = useDialogFocus<HTMLDivElement>(close);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const duration = formatDuration(Date.parse(summary.endedAt) - Date.parse(summary.startedAt));

  const save = async () => {
    setBusy(true);
    setError(null);
    const outcome = await saveSkiDayAction(summary, resort).catch((): SaveSkiDayOutcome => "unavailable");
    setBusy(false);
    if (outcome === "saved") setSaved(true);
    else setError(t(OUTCOME[outcome]));
  };

  if (sharing) {
    const city = RESORTS.find((r) => r.name === resort)?.city ?? "innsbruck";
    const numbers = {
      km: formatKm(summary.distanceM, locale),
      vertical: new Intl.NumberFormat(locale).format(summary.verticalM),
      speed: Math.round(summary.maxSpeedKmh),
      runs: summary.runs,
    };
    const text = resort ? t("track.shareText", { ...numbers, where: resort }) : t("track.shareTextPlain", numbers);
    return <PostComposer city={city} initialBody={text} initialResort={resort ?? ""} onClose={onClose} />;
  }

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={close} aria-hidden />
      <div ref={panelRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-labelledby={`${ids}-title`} tabIndex={-1}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="min-w-0">
            <h2 id={`${ids}-title`} className="text-display-md">{saved ? t("track.savedTitle") : t("track.summaryTitle")}</h2>
            <p className="truncate text-sm" style={{ color: "var(--ink-2)" }}>{resort ?? t("track.onTheHill")}</p>
          </div>
          <button type="button" onClick={close} aria-label={t("common.close")} className="flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color="var(--ink-2)" />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-6">
          <SkiDayStats {...summary} lead={{ value: duration, label: t("track.time") }} />
          {!worth && <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("track.tooShort")}</p>}
          {error && <p role="alert" className="text-sm" style={{ color: "var(--crimson)" }}>{error}</p>}
          {worth && !saved && (
            <>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="flex min-h-12 w-full items-center justify-center text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 5 }}
              >
                {busy ? t("common.saving") : t("track.save")}
              </button>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>{t("track.privacy")}</p>
            </>
          )}
          {saved && (
            <button
              type="button"
              onClick={() => setSharing(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 text-sm font-semibold"
              style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 5 }}
            >
              <Icon name="sparkles" size={16} /> {t("track.shareAsPost")}
            </button>
          )}
          <button type="button" onClick={close} className="flex min-h-11 w-full items-center justify-center text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
            {saved ? t("track.done") : t("track.discard")}
          </button>
        </div>
      </div>
    </>
  );
}
