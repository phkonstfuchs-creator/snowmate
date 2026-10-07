"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Sheet from "@/components/ui/Sheet";
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
  const t = useT();
  const locale = INTL_LOCALE[useLocale()];
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const { summary, resort } = day;
  const worth = isWorthSaving(summary);
  /* An unsaved day is gone once closed: ask first. */
  const canClose = () => !worth || saved || window.confirm(t("track.confirmDiscard"));
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
    <Sheet
      title={saved ? t("track.savedTitle") : t("track.summaryTitle")}
      subtitle={resort ?? t("track.onTheHill")}
      onClose={onClose}
      canClose={canClose}
    >
      {(close) => (
        <>
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
        </>
      )}
    </Sheet>
  );
}
