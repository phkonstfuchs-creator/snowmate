"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { deleteSkiDayAction } from "./actions";
import { formatKm, seasonTotals, type SkiDay } from "./ski-day";
import SkiDayStats from "./SkiDayStats";

/* The profile's season: totals, then the days. Nothing when there are
   none yet, so a new profile stays quiet. */
export default function SkiDays({ days, today }: { days: SkiDay[] | null; today: string }) {
  const t = useT();
  const locale = INTL_LOCALE[useLocale()];
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (days === null) return <p role="status" className="mx-4 mt-4 text-sm" style={{ color: "var(--crimson)" }}>{t("track.listUnavailable")}</p>;
  if (days.length === 0) return null;

  const season = seasonTotals(days, new Date(today));
  const shown = showAll ? days : days.slice(0, 3);
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });

  const remove = async (id: string) => {
    if (!window.confirm(t("track.confirmDelete"))) return;
    setBusy(id);
    const ok = await deleteSkiDayAction(id).catch(() => false);
    setBusy(null);
    if (ok) router.refresh();
  };

  return (
    <section className="px-4 pt-5" aria-label={t("track.season")}>
      <h2 className="text-mono-label mb-2" style={{ color: "var(--ink-2)" }}>{t("track.season")}</h2>
      <div className="px-4 py-3" style={{ background: "var(--paper-1)", border: "var(--rule-thin)" }}>
        <SkiDayStats {...season} lead={{ value: String(season.days), label: t("track.days") }} />
      </div>
      <ul className="mt-2">
        {shown.map((day) => (
          <li key={day.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "var(--rule-thin)" }}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: "var(--ink-0)" }}>{day.resort ?? t("track.onTheHill")}</p>
              <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                {date.format(new Date(day.startedAt))} · {formatKm(day.distanceM, locale)} km · {new Intl.NumberFormat(locale).format(day.verticalM)} {t("track.verticalShort")} · {t("track.runsN", { n: day.runs })}
              </p>
            </div>
            <button type="button" onClick={() => void remove(day.id)} disabled={busy === day.id} aria-label={t("track.delete")} className="flex h-11 w-11 items-center justify-center disabled:opacity-50">
              <Icon name="trash-2" size={15} color="var(--ink-2)" />
            </button>
          </li>
        ))}
      </ul>
      {days.length > 3 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-1 min-h-11 text-sm font-semibold" style={{ color: "var(--rust-ink)" }}>
          {showAll ? t("track.showLess") : t("track.showAll", { n: days.length })}
        </button>
      )}
    </section>
  );
}
