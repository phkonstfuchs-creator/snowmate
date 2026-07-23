"use client";

import { useState } from "react";
import clsx from "clsx";
import { ME, LEADERBOARD_INNSBRUCK, LEADERBOARD_SALZBURG, BADGES, getUserById } from "@/lib/data";
import type { Badge, BadgeRarity, LeaderboardEntry } from "@/lib/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import { avatarColor as avatarBg } from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import XPBar from "@/components/ui/XPBar";

const D = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER = "var(--border-subtle)";
const MUTED = "var(--text-tertiary)";
const INK = "var(--text-primary)";
const BRAND = "var(--accent-primary)";
const ORANGE = "var(--accent-warm)";

function PremiumSheet({ onClose }: { onClose: () => void }) {
  useScrollLock();

  const FEATURES = [
    { label: "Satellite map", desc: "Terrain, couloirs & off-piste options live" },
    { label: "Powder alerts", desc: "Push when 15+ cm falls in your area" },
    { label: "Advanced stats", desc: "Heatmaps, vertical, season comparisons" },
    { label: "Premium badge", desc: "Gold star on your profile & feed" },
  ];
  return (
    <>
      <div className="sheet-overlay" onClick={onClose} aria-hidden />
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="Snowmate Premium" style={{ maxHeight: "90dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex justify-center pt-3 mb-5">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, var(--ember-400), var(--ember-600))" }}>
            <Icon name="star" size={36} color="white" fill="white" strokeWidth={0} />
          </div>
        </div>
        <div className="px-5 text-center mb-6">
          <h2 className="font-black text-xl mb-1.5" style={{ color: INK }}>Snowmate Premium</h2>
          <p className="text-sm font-medium leading-relaxed" style={{ color: MUTED }}>For the ones who get up earlier and ride harder than everyone else.</p>
        </div>

        <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-2">
            <div className="p-3 text-center" style={{ background: SURFACE, borderRight: `1px solid ${BORDER}` }}>
              <p className="text-xs font-black" style={{ color: MUTED }}>Free</p>
            </div>
            <div className="p-3 text-center" style={{ background: ORANGE }}>
              <p className="text-xs font-black text-white">Premium</p>
            </div>
          </div>
          {[["Illustrated Map", "Satellite Map"], ["Basic Stats", "Heatmap + Vertical"], ["Standard Badge", "Gold Badge"], ["—", "Powder Alerts"]].map(([free, prem], i) => (
            <div key={i} className="grid grid-cols-2" style={{ borderTop: `1px solid ${BORDER}` }}>
              <div className="px-3 py-2.5 text-center" style={{ borderRight: `1px solid ${BORDER}` }}>
                <span className="text-xs font-bold" style={{ color: MUTED }}>{free}</span>
              </div>
              <div className="px-3 py-2.5 text-center" style={{ background: "var(--accent-warm-subtle)" }}>
                <span className="text-xs font-black" style={{ color: "var(--ember-400)" }}>{prem}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 space-y-2 mb-6">
          {FEATURES.map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ORANGE }}>
                <Icon name="check" size={12} color="white" strokeWidth={2.2} />
              </div>
              <div>
                <p className="font-black text-sm" style={{ color: INK }}>{label}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: MUTED }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 space-y-2">
          <button className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform" style={{ background: ORANGE, color: "white" }}>
            Start for € 2.99 / month
          </button>
          <p className="text-center text-[0.65rem] font-medium" style={{ color: MUTED }}>Cancel anytime · No minimum term</p>
          <button onClick={onClose} className="w-full py-2.5 text-sm font-bold" style={{ color: MUTED }}>Not now</button>
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

const RARITY: Record<BadgeRarity, { bg: string; ink: string; border: string; label: string }> = {
  common: { bg: SURFACE, ink: MUTED, border: BORDER, label: "Common" },
  rare: { bg: "var(--accent-primary-subtle)", ink: BRAND, border: "rgba(79,195,240,0.35)", label: "Rare" },
  epic: { bg: "var(--accent-warm-subtle)", ink: "var(--ember-400)", border: "rgba(255,162,60,0.4)", label: "Epic" },
};

function BadgeCard({ badge, earned }: { badge: Badge; earned: boolean }) {
  const r = RARITY[badge.rarity];
  const iconName = BADGE_ICON_NAME[badge.icon] ?? badge.icon;
  return (
    <div className={clsx("flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-opacity", !earned && "opacity-35")}
      style={{ background: earned ? r.bg : SURFACE, border: `1px solid ${earned ? r.border : BORDER}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(10,14,18,0.5)" }}>
        <Icon name={iconName} size={20} color={earned ? r.ink : MUTED} strokeWidth={1.5} />
      </div>
      <span className="text-[0.65rem] font-black text-center leading-tight" style={{ color: earned ? INK : MUTED }}>{badge.name}</span>
      <span className="text-[0.55rem] font-black uppercase tracking-wider" style={{ color: earned ? r.ink : MUTED }}>
        {earned ? r.label : "Locked"}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const [leaderboardCity, setLeaderboardCity] = useState<"innsbruck" | "salzburg">("innsbruck");
  const [showPremium, setShowPremium] = useState(false);
  const leaderboard = leaderboardCity === "innsbruck" ? LEADERBOARD_INNSBRUCK : LEADERBOARD_SALZBURG;
  const myRank = leaderboard.find((e) => e.userId === "me");
  const podiumEntries = [
    leaderboard[1],
    leaderboard[0],
    leaderboard[2],
  ].filter(
    (entry): entry is LeaderboardEntry => entry !== undefined,
  );

  return (
    <>
      {/* Header */}
      <div className="px-4 pt-6 pb-12 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #14202B 0%, #0A0E12 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 400 200">
            {Array.from({ length: 6 }, (_, i) => (
              <path key={i} d={`M${i * 80 - 40} 100L${i * 80} 50L${i * 80 + 40} 100L${i * 80 + 80} 50`} stroke="white" strokeWidth="1.5" fill="none" />
            ))}
          </svg>
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center" style={{ background: "rgba(79,195,240,0.15)", borderColor: "rgba(255,255,255,0.3)" }}>
              <span className="text-white font-display" style={{ fontSize: 20, fontWeight: 800 }}>{ME.avatar}</span>
            </div>
            <div>
              <h1 className="text-white font-display" style={{ fontSize: 24, fontWeight: 800 }}>{ME.name}</h1>
              <span className="text-white/70 text-sm font-semibold">@{ME.handle}</span>
            </div>
          </div>
          <button aria-label="Open settings" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(79,195,240,0.15)" }}>
            <Icon name="settings" size={16} color="white" strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4 relative z-10">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "rgba(79,195,240,0.15)" }}>
            <Icon name="star" size={12} color="white" fill="white" strokeWidth={0} />
            <span className="text-white font-black text-sm">Level {ME.level} · {ME.levelTitle}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "rgba(255,162,60,0.18)" }}>
            <span className="text-white text-xs font-black font-mono">{ME.streakWeeks} week streak</span>
          </div>
        </div>
      </div>

      {/* XP card overlapping */}
      <div className="px-4 -mt-6 relative z-20">
        <div className="rounded-2xl shadow-xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <XPBar current={ME.xp} max={ME.xpToNext} />
          <p className="text-xs font-bold mt-2" style={{ color: MUTED }}>{ME.xpToNext - ME.xp} XP to Level {ME.level + 1}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-3 gap-3">
          {[{ label: "Days", value: ME.daysThisSeason }, { label: "Resorts", value: ME.resortsVisited }, { label: "Friends", value: ME.friendIds.length }].map(({ label, value }) => (
            <div key={label} className="rounded-2xl px-3 py-4 flex flex-col items-center gap-1" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <span className="font-mono font-bold text-2xl tracking-tight" style={{ color: INK }}>{value}</span>
              <span className="text-xs font-bold" style={{ color: MUTED }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Premium banner */}
      {!ME.isPremium && (
        <div className="px-4 pt-4">
          <button onClick={() => setShowPremium(true)} className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-98 transition-transform" style={{ background: "linear-gradient(135deg, var(--ember-500), var(--ember-400))" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,0,0,0.2)" }}>
              <Icon name="star" size={18} color="white" fill="white" strokeWidth={0} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-black text-sm">Snowmate Premium</p>
              <p className="text-white/80 text-xs mt-0.5">Satellite map, powder alerts &amp; more</p>
            </div>
            <Icon name="chevron-right" size={16} color="white" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Badges */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-[0.9375rem]" style={{ color: INK }}>Badges</h2>
          <span className="text-xs font-bold" style={{ color: MUTED }}>{ME.badges.length}/{BADGES.length} earned</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BADGES.map((badge) => <BadgeCard key={badge.id} badge={badge} earned={ME.badges.includes(badge.id)} />)}
        </div>
      </div>

      {/* Streak */}
      <div className="px-4 pt-5">
        <h2 className="font-black text-[0.9375rem] mb-3" style={{ color: INK }}>Streak</h2>
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #1A2833, #131F28)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
              <Icon name="flame" size={24} color={ME.streakWeeks >= 10 ? "var(--ember-500)" : BRAND} strokeWidth={1.8} fill={ME.streakWeeks >= 10 ? "var(--ember-500)" : BRAND} fillOpacity={0.18} />
            </div>
            <div>
              <p className="font-mono font-bold text-2xl tracking-tight" style={{ color: INK }}>{ME.streakWeeks} weeks</p>
              <p className="text-sm font-bold" style={{ color: MUTED }}>in a row on the mountain</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="w-7 h-7 rounded-lg flex items-center justify-center" style={i < ME.streakWeeks ? { background: BRAND } : { background: "rgba(0,0,0,0.25)" }}>
                <Icon name="mountain" size={12} color={i < ME.streakWeeks ? D : MUTED} strokeWidth={2.2} />
              </div>
            ))}
            {ME.streakWeeks > 10 && <span className="text-xs font-black self-center font-mono" style={{ color: MUTED }}>+{ME.streakWeeks - 10}</span>}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-[0.9375rem]" style={{ color: INK }}>Top this season</h2>
          <div className="flex rounded-lg overflow-hidden" style={{ background: "var(--bg-surface-2)" }}>
            {(["innsbruck", "salzburg"] as const).map((c) => (
              <button key={c} onClick={() => setLeaderboardCity(c)}
                className="text-xs font-black px-3 py-1.5 transition-all"
                style={leaderboardCity === c ? { background: BRAND, color: D } : { color: MUTED }}>
                {c === "innsbruck" ? "IBK" : "SBG"}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-2 mb-4 pt-3">
          {podiumEntries.map((entry) => {
            const user = getUserById(entry.userId);
            if (!user) return null;
            const isFirst = entry.rank === 1;
            const blockH = isFirst ? 76 : entry.rank === 2 ? 52 : 38;
            const podBg = isFirst ? BRAND : entry.rank === 2 ? "var(--bg-surface-2)" : "var(--bg-surface-1)";
            return (
              <div key={entry.userId} className="flex flex-col items-center gap-1.5 flex-1 max-w-[110px]">
                {isFirst && <Icon name="crown" size={18} color="var(--ember-400)" fill="var(--ember-400)" strokeWidth={0} />}
                <div className={isFirst ? "story-ring" : ""}>
                  <div className="avatar-initials text-white font-black" style={{ width: isFirst ? 54 : 42, height: isFirst ? 54 : 42, background: avatarBg(user.id), fontSize: isFirst ? 17 : 13, border: isFirst ? `2.5px solid ${D}` : "none" }}>
                    {user.avatar}
                  </div>
                </div>
                <span className="text-xs font-black truncate max-w-full" style={{ color: INK }}>{entry.userId === "me" ? "You" : user.name.split(" ")[0]}</span>
                <span className="text-[0.65rem] font-bold -mt-1 font-mono" style={{ color: MUTED }}>{entry.xp.toLocaleString("en-US")} XP</span>
                <div className="w-full rounded-t-xl flex items-start justify-center pt-1.5" style={{ height: blockH, background: podBg }}>
                  <span className="font-mono font-bold" style={{ fontSize: isFirst ? 18 : 14, color: isFirst ? D : MUTED }}>{entry.rank}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {leaderboard.slice(3, 6).map((entry) => {
            const user = getUserById(entry.userId);
            if (!user) return null;
            const isMe = entry.userId === "me";
            return (
              <div key={entry.userId} className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{ background: isMe ? "var(--accent-primary-subtle)" : SURFACE, border: `1px solid ${isMe ? "rgba(79,195,240,0.35)" : BORDER}` }}>
                <span className="w-6 text-center font-black text-sm font-mono" style={{ color: MUTED }}>{entry.rank}</span>
                <div className="avatar-initials text-white font-black" style={{ width: 34, height: 34, background: avatarBg(user.id), fontSize: 11 }}>{user.avatar}</div>
                <div className="flex-1 min-w-0">
                  <span className="font-black text-sm" style={{ color: INK }}>{isMe ? "You" : user.name}</span>
                  <p className="text-xs font-bold font-mono" style={{ color: MUTED }}>{entry.days} days</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm font-mono" style={{ color: BRAND }}>{entry.xp.toLocaleString("en-US")}</span>
                  <span className="text-xs font-bold block" style={{ color: MUTED }}>XP</span>
                </div>
              </div>
            );
          })}
        </div>

        {myRank && myRank.rank > 5 && (
          <div className="mt-2 flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "var(--accent-primary-subtle)", border: "1px solid rgba(79,195,240,0.35)" }}>
            <span className="w-6 text-center font-black text-sm font-mono" style={{ color: MUTED }}>#{myRank.rank}</span>
            <div className="avatar-initials text-white font-black" style={{ width: 34, height: 34, background: avatarBg("me"), fontSize: 11 }}>{ME.avatar}</div>
            <div className="flex-1">
              <span className="font-black text-sm" style={{ color: INK }}>You</span>
              <p className="text-xs font-bold font-mono" style={{ color: MUTED }}>{myRank.days} days</p>
            </div>
            <div>
              <span className="font-black text-sm font-mono" style={{ color: BRAND }}>{myRank.xp.toLocaleString("en-US")}</span>
              <span className="text-xs font-bold block" style={{ color: MUTED }}>XP</span>
            </div>
          </div>
        )}
      </div>

      {showPremium && <PremiumSheet onClose={() => setShowPremium(false)} />}
    </>
  );
}
