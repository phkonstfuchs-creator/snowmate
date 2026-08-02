"use client";

import { RidePost, User } from "@/lib/types";
import ResortScene from "@/components/ResortScene";
import Avatar from "@/components/ui/Avatar";
import Tag from "@/components/ui/Tag";
import Icon from "@/components/ui/Icon";

interface RideCardProps {
  post: RidePost;
  author: User;
  joinedUsers: User[];
  isJoined: boolean;
  onClick: () => void;
  onJoin?: (e: React.MouseEvent) => void;
  index?: number;
}

export default function RideCard({ post, author, joinedUsers, isJoined, onClick, onJoin, index = 0 }: RideCardProps) {
  const openSpots = post.totalSpots - post.takenSpots;
  const isFull = openSpots <= 0;

  return (
    <article
      className="card-tap anim-fade-up overflow-hidden"
      style={{
        animationDelay: `${index * 60}ms`,
        background: "var(--paper-1)",
        border: "var(--rule-thick)",
        boxShadow: "var(--shadow-print)",
      }}
      onClick={onClick}
    >
      {/* Resort scene header */}
      <div className="relative h-32 overflow-hidden" style={{ borderBottom: "var(--rule-thick)" }}>
        <ResortScene name={post.resort} className="absolute inset-0 h-full w-full" />
        {/* Treffzeit als aufgedruckte Marke */}
        <div
          className="text-mono-label absolute left-0 top-0 flex items-center gap-1.5 px-2.5 py-1"
          style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}
        >
          <span className="pulse-dot" style={{ width: 6, height: 6, background: "var(--ochre)" }} />
          {post.meetTime}
        </div>
        <div className="absolute right-2 top-2">
          <Tag level={post.abilityLevel} />
        </div>
      </div>

      {/* Ort als gedruckte Zeile unter der Szene */}
      <div
        className="flex items-center gap-1.5 px-4 py-2"
        style={{ background: "var(--paper-0)", borderBottom: "1px solid var(--border-hairline)" }}
      >
        <Icon name="mountain" size={13} color="var(--ink-0)" strokeWidth={2.2} />
        <span className="font-display text-base uppercase" style={{ color: "var(--ink-0)", letterSpacing: "-0.02em" }}>
          {post.resort}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-3">
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar id={author.id} initials={author.avatar} size={32} verified={author.accountType === "verified"} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold" style={{ color: "var(--ink-0)" }}>{author.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{post.postedAt}</span>
              {author.instagram && (
                <span className="text-[0.6rem] font-bold px-1.5 py-0.5" style={{ color: "var(--ink-2)", border: "1px solid var(--border-hairline)" }}>
                  IG
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm mb-3 leading-snug line-clamp-2 font-medium" style={{ color: "var(--text-secondary)" }}>{post.caption}</p>
        )}

        {/* Meet point */}
        <div className="flex items-center gap-1.5 mb-3">
          <Icon name="map-pin" size={12} color="var(--rust)" strokeWidth={2} />
          <span className="text-xs font-semibold truncate" style={{ color: "var(--text-tertiary)" }}>{post.meetPoint}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5 flex-1">
            {joinedUsers.slice(0, 5).map((u) => (
              <div key={u.id} className="rounded-full" style={{ boxShadow: "0 0 0 2px var(--paper-1)" }}>
                <Avatar id={u.id} initials={u.avatar} size={22} />
              </div>
            ))}
            {joinedUsers.length > 0 && (
              <span className="ml-2.5 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>{post.takenSpots} dabei</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[0.7rem] font-bold font-mono"
              style={{ color: isFull ? "var(--ink-3)" : openSpots === 1 ? "var(--rust)" : "var(--ink-2)" }}
            >
              {isFull ? "voll" : `${openSpots} frei`}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onJoin?.(e); }}
              disabled={isFull && !isJoined}
              className="text-mono-label px-3.5 py-2 transition-transform active:translate-x-[1px] active:translate-y-[1px]"
              style={
                isJoined
                  ? { background: "var(--paper-2)", color: "var(--ink-1)", border: "1px solid var(--ink-0)" }
                  : isFull
                  ? { background: "var(--paper-2)", color: "var(--ink-3)", border: "1px solid var(--paper-3)" }
                  : { background: "var(--rust)", color: "var(--paper-0)", border: "1px solid var(--ink-0)" }
              }
            >
              {isJoined ? "Dabei" : "Mitfahren"}
            </button>
          </div>
        </div>
      </div>

      {/* Tap hint */}
      <div
        className="text-mono-label flex items-center justify-center gap-1.5 py-2"
        style={{ borderTop: "1px solid var(--border-hairline)", color: "var(--ink-2)" }}
      >
        Details &amp; Profil
        <Icon name="chevron-right" size={11} color="var(--ink-2)" strokeWidth={2} />
      </div>
    </article>
  );
}
