"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { BADGES, ME } from "@/lib/data";
import clsx from "clsx";
import ConversationThread from "@/components/ConversationThread";
import { useScrollLock } from "@/lib/useScrollLock";
import { avatarColor } from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import XPBar from "@/components/ui/XPBar";

const D = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER = "var(--border-subtle)";
const MUTED = "var(--text-tertiary)";
const INK = "var(--text-primary)";
const BRAND = "var(--accent-primary)";

const BADGE_BG: Record<string, string> = {
  first_tracks: "var(--accent-warm-subtle)",
  storm_chaser: "var(--accent-primary-subtle)",
  local_legend: "var(--accent-primary-subtle)",
  crew_builder: "var(--accent-primary-subtle)",
  powder_hound: "var(--accent-primary-subtle)",
  season_warrior: "var(--accent-warm-subtle)",
  night_rider: "var(--bg-surface-2)",
  dawn_patrol: "var(--accent-warm-subtle)",
  carpool_king: "rgba(74,222,154,0.14)",
  multi_pass: "var(--accent-primary-subtle)",
};
const BADGE_INK: Record<string, string> = {
  first_tracks: "var(--ember-400)",
  storm_chaser: BRAND,
  local_legend: BRAND,
  crew_builder: BRAND,
  powder_hound: BRAND,
  season_warrior: "var(--ember-400)",
  night_rider: "var(--text-secondary)",
  dawn_patrol: "var(--ember-400)",
  carpool_king: "var(--status-success)",
  multi_pass: BRAND,
};

export default function UserProfileSheet({ user, onClose, onMessage }: { user: User; onClose: () => void; onMessage?: (userId: string) => void }) {
  useScrollLock();
  const [showThread, setShowThread] = useState(false);
  const isMe = user.id === ME.id;
  const isFriend = ME.friendIds.includes(user.id);
  const earnedBadges = BADGES.filter((b) => user.badges.includes(b.id));

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel" style={{ maxHeight: "88dvh", overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 z-10" style={{ background: SURFACE }}>
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>

        {/* Hero */}
        <div className="px-5 pt-4 pb-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0" style={{ background: avatarColor(user.id) }}>
                {user.avatar}
              </div>
              {user.isPremium && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ background: "var(--accent-warm)", borderColor: SURFACE }}>
                  <Icon name="star" size={9} color="white" fill="white" strokeWidth={0} />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-black text-base" style={{ color: INK }}>{user.name}</h2>
                {user.accountType === "verified" && (
                  <Icon name="badge-check" size={16} color={BRAND} fill={BRAND} strokeWidth={1.5} />
                )}
                {user.isMinor && (
                  <span className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-warm-subtle)", color: "var(--ember-400)" }}>U18</span>
                )}
              </div>
              <p className="text-sm font-bold mt-0.5" style={{ color: MUTED }}>@{user.handle} · Level {user.level} {user.levelTitle}</p>
              {user.bio && <p className="text-sm font-medium mt-1.5 leading-snug" style={{ color: "var(--text-secondary)" }}>{user.bio}</p>}
            </div>
          </div>

          {(user.instagram || user.snapchat) && (
            <div className="flex gap-2 mt-3">
              {user.instagram && (
                <a href={`https://instagram.com/${user.instagram}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  style={{ background: "rgba(200,90,160,0.14)", color: "#e59ecb", border: "1px solid rgba(200,90,160,0.3)" }}
                  onClick={(e) => e.stopPropagation()}>
                  <Icon name="instagram" size={12} />
                  @{user.instagram}
                </a>
              )}
              {user.snapchat && (
                <a href={`https://snapchat.com/add/${user.snapchat}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  style={{ background: "var(--accent-warm-subtle)", color: "var(--ember-300)", border: "1px solid rgba(255,162,60,0.3)" }}
                  onClick={(e) => e.stopPropagation()}>
                  {user.snapchat}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {[
            { label: "Days", value: user.daysThisSeason },
            { label: "Resorts", value: user.resortsVisited },
            { label: "Streak", value: `${user.streakWeeks}w` },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex flex-col items-center py-4 gap-0.5" style={i < 2 ? { borderRight: `1px solid ${BORDER}` } : {}}>
              <span className="font-mono font-bold text-xl" style={{ color: INK }}>{value}</span>
              <span className="text-xs font-semibold" style={{ color: MUTED }}>{label}</span>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="mb-2">
            <span className="text-xs font-black" style={{ color: BRAND }}>Level {user.level} · {user.levelTitle}</span>
          </div>
          <XPBar current={user.xp} max={user.xpToNext} />
        </div>

        {/* Favorite resort */}
        {user.favoriteResort && (
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <Icon name="mountain" size={14} color={BRAND} strokeWidth={2} />
            <span className="text-sm font-medium" style={{ color: MUTED }}>Favorite resort: <span className="font-black" style={{ color: INK }}>{user.favoriteResort}</span></span>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="px-5 pt-4 pb-5">
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-3" style={{ color: MUTED }}>Badges ({earnedBadges.length})</p>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map((b) => (
                <div key={b.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-black"
                  style={{ background: BADGE_BG[b.id] ?? "var(--accent-primary-subtle)", color: BADGE_INK[b.id] ?? BRAND }}>
                  {b.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isMe && (
          <div className="px-5 pb-4 flex gap-2">
            <button
              onClick={() => { if (onMessage) { onMessage(user.id); } else { setShowThread(true); } }}
              className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform"
              style={{ background: BRAND, color: D }}
            >
              Message
            </button>
            <button className={clsx("flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform border-2")}
              style={isFriend ? { border: `2px solid ${BORDER}`, color: MUTED } : { border: `2px solid ${BRAND}`, color: BRAND }}>
              {isFriend ? "In crew" : "Add to crew"}
            </button>
          </div>
        )}
      </div>

      {showThread && <ConversationThread userId={user.id} onClose={() => setShowThread(false)} />}
    </>
  );
}
