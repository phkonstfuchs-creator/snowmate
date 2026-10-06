"use client";

import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { formatKm } from "./ski-day";

/* The numbers of a day (or a season) in one calm row. */
export default function SkiDayStats({
  distanceM,
  verticalM,
  maxSpeedKmh,
  runs,
  lead,
}: {
  distanceM: number;
  verticalM: number;
  maxSpeedKmh: number;
  runs: number;
  /* An optional first cell, e.g. the elapsed time or the number of days. */
  lead?: { value: string; label: string };
}) {
  const t = useT();
  const locale = INTL_LOCALE[useLocale()];
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const cells = [
    ...(lead ? [lead] : []),
    { value: formatKm(distanceM, locale), label: t("track.km") },
    { value: number.format(verticalM), label: t("track.vertical") },
    { value: number.format(maxSpeedKmh), label: t("track.topSpeed") },
    { value: String(runs), label: t("track.runs") },
  ];
  return (
    <dl className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0">
          <dd className="text-mono-data truncate" style={{ color: "var(--ink-0)", fontSize: 20 }}>{cell.value}</dd>
          <dt className="truncate text-[0.7rem] font-semibold" style={{ color: "var(--ink-2)" }}>{cell.label}</dt>
        </div>
      ))}
    </dl>
  );
}
