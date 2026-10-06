"use client";

import { useState, useTransition } from "react";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/translate";
import { initialsFor } from "@/features/profile/profile-input";
import { leaderboardAction } from "./actions";
import { LEADERBOARD_METRICS, formatMetric, type LeaderboardMetric, type LeaderboardRow, type LeaderboardScope } from "./leaderboard";

const METRIC_LABEL: Record<LeaderboardMetric, MessageKey> = {
  vertical: "game.metricVertical",
  distance: "game.metricDistance",
  days: "game.metricDays",
  speed: "game.metricSpeed",
};
const METRIC_UNIT: Record<LeaderboardMetric, MessageKey> = {
  vertical: "game.unitVertical",
  distance: "game.unitDistance",
  days: "game.unitDays",
  speed: "game.unitSpeed",
};

/* This season's ranking among friends or in the region. Shows the top
   five and your own place; the rest one tap away. */
export default function Leaderboard({ initial, inRegion }: { initial: LeaderboardRow[] | null; inRegion: boolean }) {
  const t = useT();
  const locale = INTL_LOCALE[useLocale()];
  const [scope, setScope] = useState<LeaderboardScope>("friends");
  const [metric, setMetric] = useState<LeaderboardMetric>("vertical");
  const [rows, setRows] = useState(initial);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = (nextScope: LeaderboardScope, nextMetric: LeaderboardMetric) => {
    setScope(nextScope);
    setMetric(nextMetric);
    setShowAll(false);
    startTransition(async () => {
      setRows(await leaderboardAction(nextScope, nextMetric).catch(() => null));
    });
  };

  const top = rows ? (showAll ? rows : rows.filter((row, i) => i < 5 || row.isMe)) : [];
  const empty = rows !== null && rows.length === 0;

  return (
    <section className="px-4 pt-6" aria-label={t("game.leaderboard")} aria-busy={pending}>
      <h2 className="text-mono-label mb-2" style={{ color: "var(--ink-2)" }}>{t("game.leaderboard")}</h2>
      <SegmentedControl
        options={[{ value: "friends", label: t("game.friends") }, { value: "region", label: t("game.region") }]}
        value={scope}
        onChange={(next) => load(next, metric)}
        ariaLabel={t("game.leaderboard")}
      />
      <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto" role="group" aria-label={t("game.metric")}>
        {LEADERBOARD_METRICS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === metric}
            onClick={() => item !== metric && load(scope, item)}
            className="min-h-9 shrink-0 px-3 text-xs font-semibold"
            style={{
              borderRadius: 999,
              background: item === metric ? "var(--ink-0)" : "transparent",
              color: item === metric ? "var(--paper-0)" : "var(--ink-1)",
              boxShadow: item === metric ? "none" : "inset 0 0 0 1px var(--border-rule)",
            }}
          >
            {t(METRIC_LABEL[item])}
          </button>
        ))}
      </div>

      {rows === null && <p role="status" className="mt-3 text-sm" style={{ color: "var(--crimson)" }}>{t("game.unavailable")}</p>}
      {empty && <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>{scope === "friends" ? t("game.emptyFriends") : t("game.emptyRegion")}</p>}
      {scope === "region" && !inRegion && rows !== null && <p className="mt-3 text-xs" style={{ color: "var(--ink-2)" }}>{t("game.notInRegion")}</p>}

      {top.length > 0 && (
        <ol className="mt-3" style={{ opacity: pending ? 0.6 : 1 }}>
          {top.map((row, i) => (
            <li
              key={`${row.rank}-${row.userId ?? `anon-${i}`}`}
              className="flex items-center gap-3 px-2 py-2"
              style={{ background: row.isMe ? "var(--paper-2)" : "transparent", borderRadius: 10 }}
              aria-current={row.isMe ? "true" : undefined}
            >
              <span className="text-mono-data w-6 shrink-0 text-right" style={{ color: row.rank <= 3 ? "var(--rust)" : "var(--ink-2)" }}>{row.rank}</span>
              {row.userId ? (
                <Avatar id={row.userId} initials={initialsFor(row.name, row.handle)} size={30} />
              ) : (
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center text-xs font-semibold" style={{ background: "var(--paper-2)", borderRadius: 999, color: "var(--ink-2)" }} aria-hidden>?</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: "var(--ink-0)" }}>
                {row.anonymous ? t("game.anonymous") : row.name ?? "?"}
                {row.isMe && <span className="ml-1 font-normal" style={{ color: "var(--ink-2)" }}>{t("game.you")}</span>}
              </span>
              <span className="text-mono-data shrink-0" style={{ color: "var(--ink-0)" }}>
                {formatMetric(metric, row.value, locale)} <span className="text-xs" style={{ color: "var(--ink-2)" }}>{t(METRIC_UNIT[metric])}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {rows && rows.length > top.length && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-1 min-h-11 text-sm font-semibold" style={{ color: "var(--rust-ink)" }}>
          {t("game.showAll", { n: rows.length })}
        </button>
      )}
    </section>
  );
}
