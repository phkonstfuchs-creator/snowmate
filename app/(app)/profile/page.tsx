"use client";

import { useEffect, useRef, useState } from "react";
import { ME, LEADERBOARD_INNSBRUCK, LEADERBOARD_SALZBURG, BADGES, getUserById } from "@/lib/data";
import type { Badge, BadgeRarity, LeaderboardEntry } from "@/lib/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import { avatarColor as avatarBg } from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { signOutAction } from "@/features/auth/actions";

const PAPER = "var(--paper-0)";
const PAPER_1 = "var(--paper-1)";
const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PINE = "var(--pine)";
const OCHRE = "var(--ochre)";

/* Sektionsmarke: Mono-Label auf einer gedruckten Linie */
function SectionRule({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="section-rule">
      <h2 className="text-mono-label" style={{ color: INK }}>{label}</h2>
      {right}
    </div>
  );
}

function PremiumSheet({ onClose }: { onClose: () => void }) {
  useScrollLock();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    function getFocusable(): HTMLElement[] {
      return Array.from(
        panel!.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    getFocusable()[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const FEATURES: [string, string][] = [
    ["Satellitenkarte", "Gelände, Rinnen und Off-Piste-Lines live"],
    ["Powder-Alarm", "Push, sobald 15+ cm in deiner Region fallen"],
    ["Erweiterte Zahlen", "Heatmaps, Höhenmeter, Saisonvergleich"],
    ["Premium-Stempel", "Goldener Stempel auf Profil und im Feed"],
  ];

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className="sheet-panel paper-grain"
        role="dialog"
        aria-modal="true"
        aria-label="Snowmate Premium"
        style={{ maxHeight: "90dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}
      >
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: "var(--rule-thin)" }}>
          <p className="text-mono-label mb-2" style={{ color: RUST }}>Ausgabe 01 · Saison 25/26</p>
          <h2 className="text-display-md" style={{ color: INK }}>Snowmate<br />Premium</h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-1)" }}>
            Für alle, die früher aufstehen und länger bleiben als der Rest.
          </p>
        </div>

        <div style={{ borderBottom: "var(--rule-thin)" }}>
          {FEATURES.map(([label, desc], i) => (
            <div
              key={label}
              className="flex items-baseline gap-3 px-5 py-3"
              style={{ borderTop: i > 0 ? "1px solid var(--border-hairline)" : "none" }}
            >
              <span className="text-mono-label flex-shrink-0" style={{ color: RUST }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="font-semibold text-[0.9375rem]" style={{ color: INK }}>{label}</p>
                <p className="text-sm mt-0.5" style={{ color: INK_2 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pt-5 space-y-3">
          <button
            className="w-full py-4 font-display text-lg uppercase tracking-tight"
            style={{ background: OCHRE, color: INK, border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }}
          >
            2,99 € / Monat
          </button>
          <p className="text-center text-mono-label" style={{ color: INK_2 }}>
            Monatlich kündbar · Keine Mindestlaufzeit
          </p>
          <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold underline" style={{ color: INK_2 }}>
            Jetzt nicht
          </button>
        </div>
      </div>
    </>
  );
}

const BADGE_ICON_NAME: Record<string, string> = {
  sunrise: "sunrise",
  storm_chaser: "snowflake",
  local_legend: "mountain",
  crew_builder: "users",
  powder_hound: "wind",
  season_warrior: "trophy",
  night_rider: "moon",
  dawn_patrol: "alarm",
  carpool_king: "car",
  multi_pass: "map",
};

/* Stempelfarbe nach Seltenheit — wie unterschiedliche Stempelkissen */
const STAMP: Record<BadgeRarity, string> = {
  common: "var(--ink-2)",
  rare: PINE,
  epic: RUST,
};

/* Hüttenstempel: Doppelring, leicht schief aufgedrückt */
function Stamp({ badge, earned, index }: { badge: Badge; earned: boolean; index: number }) {
  const color = STAMP[badge.rarity];
  const iconName = BADGE_ICON_NAME[badge.icon] ?? badge.icon;
  const tilt = [-7, 5, -3, 8, -5, 4, -8, 6, -4, 7][index % 10];

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 84 }}>
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 66,
          height: 66,
          transform: earned ? `rotate(${tilt}deg)` : "none",
          border: earned ? `2px solid ${color}` : "1.5px dashed var(--paper-3)",
          boxShadow: earned ? `inset 0 0 0 3px var(--paper-0), inset 0 0 0 4px ${color}` : "none",
          opacity: earned ? 0.92 : 1,
        }}
      >
        <Icon
          name={iconName}
          size={24}
          color={earned ? color : "var(--ink-3)"}
          strokeWidth={earned ? 1.9 : 1.4}
        />
      </div>
      <span
        className="text-[0.65rem] text-center leading-tight uppercase"
        style={{
          fontFamily: "var(--font-mono-stack)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: earned ? INK : "var(--ink-3)",
        }}
      >
        {badge.name}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const [leaderboardCity, setLeaderboardCity] = useState<"innsbruck" | "salzburg">("innsbruck");
  const [showPremium, setShowPremium] = useState(false);
  const leaderboard = leaderboardCity === "innsbruck" ? LEADERBOARD_INNSBRUCK : LEADERBOARD_SALZBURG;
  const myRank = leaderboard.find((e) => e.userId === "me");
  const pct = Math.min(100, Math.round((ME.xp / ME.xpToNext) * 100));
  const topThree = leaderboard.slice(0, 3).filter((e): e is LeaderboardEntry => e !== undefined);
  const maxXp = topThree[0]?.xp ?? 1;

  const STATS: [string, number][] = [
    ["Tage", ME.daysThisSeason],
    ["Orte", ME.resortsVisited],
    ["Crew", ME.friendIds.length],
  ];

  return (
    <div className="paper-grain" style={{ background: PAPER }}>
      {/* ── Plakatkopf ─────────────────────────────────────── */}
      <header className="relative overflow-hidden px-4 pt-5 pb-6" style={{ borderBottom: "var(--rule-heavy)" }}>
        <div className="halftone absolute -top-8 -right-10 w-44 h-44" aria-hidden="true" />

        <div className="relative flex items-start justify-between">
          <p className="text-mono-label" style={{ color: RUST }}>
            Saison 25/26 · {leaderboardCity === "innsbruck" ? "Innsbruck" : "Salzburg"}
          </p>
          <button
            aria-label="Einstellungen öffnen"
            className="-mt-2 -mr-1 flex h-11 w-11 items-center justify-center"
          >
            <Icon name="settings" size={18} color={INK} strokeWidth={1.9} />
          </button>
        </div>

        {/* Leerzeichen zwischen den Zeilen, sonst ergibt der
            Blockumbruch den Namen "FelixGruber" fuer Screenreader */}
        <h1 className="text-display-hero relative mt-2" style={{ color: INK }}>
          {ME.name.split(" ").map((word, i) => (
            <span key={word} className="block">
              {i > 0 ? " " : null}
              {word}
            </span>
          ))}
        </h1>

        <div className="relative mt-4 flex items-center gap-3">
          <div
            className="avatar-initials"
            style={{ width: 46, height: 46, background: avatarBg("me"), color: PAPER, fontSize: 17 }}
          >
            {ME.avatar}
          </div>
          <div>
            <p className="text-mono-label" style={{ color: INK }}>
              Stufe {ME.level} · {ME.levelTitle}
            </p>
            <p className="text-sm mt-0.5" style={{ color: INK_2 }}>@{ME.handle}</p>
          </div>
        </div>
      </header>

      {/* ── Messfeld: XP als Instrumentenanzeige ───────────── */}
      <section className="px-4 pt-5">
        <div className="print-card px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-mono-data-lg" style={{ color: INK }}>
              {ME.xp.toLocaleString("de-DE")}
            </span>
            <span className="text-mono-label" style={{ color: INK_2 }}>
              / {ME.xpToNext.toLocaleString("de-DE")} XP
            </span>
          </div>

          <div className="xp-bar-track mt-3">
            <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-mono-label mt-2" style={{ color: INK_2 }}>
            Noch {(ME.xpToNext - ME.xp).toLocaleString("de-DE")} XP bis Stufe {ME.level + 1}
          </p>

          <div className="mt-4 grid grid-cols-3" style={{ borderTop: "var(--rule-thin)" }}>
            {STATS.map(([label, value], i) => (
              <div
                key={label}
                className="flex flex-col items-center gap-0.5 pt-3"
                style={{ borderLeft: i > 0 ? "1px solid var(--border-hairline)" : "none" }}
              >
                <span className="text-mono-data" style={{ color: INK }}>{value}</span>
                <span className="text-mono-label" style={{ color: INK_2 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Premium: Ocker-Block, hart versetzt ────────────── */}
      {!ME.isPremium && (
        <section className="px-4 pt-5">
          <button
            onClick={() => setShowPremium(true)}
            className="card-tap flex w-full items-center gap-3 px-4 py-3.5 text-left"
            style={{ background: OCHRE, border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }}
          >
            <Icon name="star" size={20} color={INK} fill={INK} strokeWidth={0} />
            <div className="flex-1">
              <p className="font-display text-lg uppercase leading-none" style={{ color: INK, letterSpacing: "-0.02em" }}>
                Premium
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--ink-1)" }}>
                Satellitenkarte, Powder-Alarm &amp; mehr
              </p>
            </div>
            <Icon name="chevron-right" size={18} color={INK} strokeWidth={2} />
          </button>
        </section>
      )}

      {/* ── Stempel ────────────────────────────────────────── */}
      <section className="pt-7">
        <div className="px-4">
          <SectionRule
            label="Stempel"
            right={
              <span className="text-mono-label" style={{ color: INK_2 }}>
                {ME.badges.length}/{BADGES.length}
              </span>
            }
          />
        </div>
        <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {BADGES.map((badge, i) => (
            <Stamp key={badge.id} badge={badge} earned={ME.badges.includes(badge.id)} index={i} />
          ))}
        </div>
      </section>

      {/* ── Serie ──────────────────────────────────────────── */}
      <section className="px-4 pt-7">
        <SectionRule label="Serie" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-mono-data-lg" style={{ color: INK }}>{ME.streakWeeks}</p>
            <p className="text-sm mt-1" style={{ color: INK_2 }}>Wochen in Folge am Berg</p>
          </div>
          <Icon name="flame" size={30} color={RUST} strokeWidth={1.8} />
        </div>
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 10 }, (_, i) => {
            const filled = i < ME.streakWeeks;
            return (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: 26,
                  background: filled ? RUST : "transparent",
                  border: filled ? "none" : "1px solid var(--paper-3)",
                }}
              />
            );
          })}
        </div>
      </section>

      {/* ── Saisonwertung ──────────────────────────────────── */}
      <section className="px-4 pt-7 pb-6">
        <SectionRule
          label="Saisonwertung"
          right={
            <div className="city-toggle-track" role="group" aria-label="Region der Wertung" style={{ width: 132 }}>
              {(["innsbruck", "salzburg"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setLeaderboardCity(c)}
                  aria-pressed={leaderboardCity === c}
                  aria-label={c === "innsbruck" ? "Innsbruck" : "Salzburg"}
                  className={`city-toggle-btn${leaderboardCity === c ? " active" : ""}`}
                >
                  {c === "innsbruck" ? "IBK" : "SBG"}
                </button>
              ))}
            </div>
          }
        />

        {/* Balken statt Podest — gedruckte Skala */}
        <div className="space-y-2.5">
          {topThree.map((entry) => {
            const user = getUserById(entry.userId);
            if (!user) return null;
            const isMe = entry.userId === "me";
            return (
              <div key={entry.userId} className="flex items-center gap-2.5">
                <span className="text-mono-label w-5 flex-shrink-0" style={{ color: INK }}>
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="truncate text-[0.9375rem]"
                      style={{ color: INK, fontWeight: isMe ? 700 : 500 }}
                    >
                      {isMe ? "Du" : user.name}
                    </span>
                    <span className="text-mono-label flex-shrink-0" style={{ color: INK_2 }}>
                      {entry.xp.toLocaleString("de-DE")}
                    </span>
                  </div>
                  <div className="mt-1" style={{ height: 10, background: "var(--paper-2)", border: "1px solid var(--border-hairline)" }}>
                    <div
                      style={{
                        width: `${Math.round((entry.xp / maxXp) * 100)}%`,
                        height: "100%",
                        background: entry.rank === 1 ? OCHRE : isMe ? RUST : PINE,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ränge 4–6 als gedruckte Tabelle */}
        <div className="mt-4" style={{ borderTop: "var(--rule-thin)" }}>
          {leaderboard.slice(3, 6).map((entry) => {
            const user = getUserById(entry.userId);
            if (!user) return null;
            const isMe = entry.userId === "me";
            return (
              <div
                key={entry.userId}
                className="flex items-baseline gap-3 py-2.5"
                style={{
                  borderBottom: "1px solid var(--border-hairline)",
                  background: isMe ? "var(--accent-primary-subtle)" : "transparent",
                }}
              >
                <span className="text-mono-label w-5" style={{ color: INK_2 }}>{entry.rank}</span>
                <span className="flex-1 truncate text-[0.9375rem]" style={{ color: INK, fontWeight: isMe ? 700 : 400 }}>
                  {isMe ? "Du" : user.name}
                </span>
                <span className="text-mono-label" style={{ color: INK_2 }}>{entry.days} Tage</span>
                <span className="text-mono-label w-14 text-right" style={{ color: INK }}>
                  {entry.xp.toLocaleString("de-DE")}
                </span>
              </div>
            );
          })}

          {myRank && myRank.rank > 5 && (
            <div
              className="flex items-baseline gap-3 py-2.5"
              style={{ borderBottom: "1px solid var(--border-hairline)", background: "var(--accent-primary-subtle)" }}
            >
              <span className="text-mono-label w-5" style={{ color: INK_2 }}>{myRank.rank}</span>
              <span className="flex-1 text-[0.9375rem] font-bold" style={{ color: INK }}>Du</span>
              <span className="text-mono-label" style={{ color: INK_2 }}>{myRank.days} Tage</span>
              <span className="text-mono-label w-14 text-right" style={{ color: INK }}>
                {myRank.xp.toLocaleString("de-DE")}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Abmelden ───────────────────────────────────────── */}
      <div className="px-4 pb-8">
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-mono-label flex min-h-12 w-full items-center justify-center gap-2"
            style={{ border: "var(--rule-thin)", color: "var(--crimson)", background: PAPER_1 }}
          >
            <Icon name="log-out" size={15} />
            Abmelden
          </button>
        </form>
      </div>

      {showPremium && <PremiumSheet onClose={() => setShowPremium(false)} />}
    </div>
  );
}
