"use client";

import Icon from "@/components/ui/Icon";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/translate";
import type { ResortConditions, WeatherKind } from "./conditions";

const INK = "var(--text-primary)";
const MUTED = "var(--text-tertiary)";
const SURFACE = "var(--bg-surface-1)";
const BORDER = "var(--border-subtle)";

export const WEATHER_ICON: Record<WeatherKind, string> = {
  sun: "sun", partly: "cloud-sun", cloud: "cloud", fog: "cloud-fog", rain: "cloud-rain", snow: "cloud-snow", storm: "cloud-lightning",
};
export const WEATHER_LABEL: Record<WeatherKind, MessageKey> = {
  sun: "cond.sun", partly: "cond.partly", cloud: "cond.cloud", fog: "cond.fog", rain: "cond.rain", snow: "cond.snow", storm: "cond.storm",
};

/* One line for the resort list. */
export function ConditionsLine({ conditions }: { conditions: ResortConditions }) {
  const t = useT();
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold font-mono" style={{ color: MUTED }}>
      <Icon name={WEATHER_ICON[conditions.kind]} size={13} aria-label={t(WEATHER_LABEL[conditions.kind])} />
      {t("cond.summary", { snow: conditions.newSnowCm, temp: conditions.topTempC })}
    </span>
  );
}

/* Snow, temperatures, wind and a three-day outlook for the resort sheet. */
export default function ConditionsPanel({ conditions }: { conditions: ResortConditions | null }) {
  const t = useT();
  const locale = useLocale();
  if (!conditions) {
    return <p className="px-5 mt-4 text-sm" style={{ color: MUTED }}>{t("cond.unavailable")}</p>;
  }
  const weekday = new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: "short", timeZone: "Europe/Vienna" });
  const stats = [
    { label: t("cond.newSnow"), value: `${conditions.newSnowCm} cm` },
    { label: t("cond.snowDepth"), value: `${conditions.snowDepthCm} cm` },
    { label: t("cond.wind"), value: `${conditions.windKmh} km/h` },
  ];
  return (
    <section className="px-5 mt-4" aria-label={t("cond.title")}>
      <div className="flex items-center justify-between gap-3 p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3">
          <Icon name={WEATHER_ICON[conditions.kind]} size={30} color={INK} />
          <div>
            <p className="text-sm font-black" style={{ color: INK }}>{t(WEATHER_LABEL[conditions.kind])}</p>
            <p className="text-xs font-semibold" style={{ color: MUTED }}>
              {t("cond.top")} {conditions.topTempC}° · {t("cond.valley")} {conditions.baseTempC}°
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="p-3 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <p className="font-black text-lg" style={{ color: INK }}>{value}</p>
            <p className="text-[0.65rem] font-semibold" style={{ color: MUTED }}>{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[0.65rem] font-black mt-4 mb-2" style={{ color: MUTED }}>
        {t("cond.next3")} · {t("cond.expected", { n: conditions.forecastSnowCm })}
      </p>
      <ol className="grid grid-cols-3 gap-3">
        {conditions.days.map((day) => (
          <li key={day.date} className="flex flex-col items-center gap-1 p-2" style={{ border: `1px solid ${BORDER}` }}>
            <span className="text-xs font-bold" style={{ color: MUTED }}>{weekday.format(new Date(`${day.date}T12:00:00Z`))}</span>
            <Icon name={WEATHER_ICON[day.kind]} size={20} color={INK} aria-label={t(WEATHER_LABEL[day.kind])} />
            <span className="text-xs font-black" style={{ color: INK }}>{day.snowCm} cm</span>
            <span className="text-[0.65rem]" style={{ color: MUTED }}>{day.minC}° / {day.maxC}°</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[0.65rem]" style={{ color: MUTED }}>{t("cond.source")}</p>
    </section>
  );
}
