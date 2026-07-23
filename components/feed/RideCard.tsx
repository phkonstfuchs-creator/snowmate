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
      className="card-tap rounded-2xl overflow-hidden anim-fade-up"
      style={{
        animationDelay: `${index * 60}ms`,
        background: "var(--bg-surface-1)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-card)",
      }}
      onClick={onClick}
    >
      {/* Resort scene header */}
      <div className="relative h-36 overflow-hidden">
        <ResortScene name={post.resort} className="absolute inset-0 w-full h-full" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.60) 100%)" }}
        />
        {/* Resort name bottom-left */}
        <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
          <Icon name="mountain" size={13} color="white" strokeWidth={2.2} />
          <span className="font-display text-white drop-shadow-sm" style={{ fontSize: 15, fontWeight: 700 }}>{post.resort}</span>
        </div>
        {/* Level badge top-right */}
        <div className="absolute top-3 right-3">
          <Tag level={post.abilityLevel} />
        </div>
        {/* Meet time pill top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1 backdrop-blur-sm">
          <span className="pulse-dot" style={{ width: 6, height: 6 }} />
          <span className="text-xs font-bold font-mono text-white">{post.meetTime}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-3">
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar id={author.id} initials={author.avatar} size={32} verified={author.accountType === "verified"} />
          <div className="flex-1 min-w-0">
            <span className="font-black text-sm text-white tracking-tight">{author.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{post.postedAt}</span>
              {author.instagram && (
                <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full" style={{ color: "#e59ecb", background: "rgba(200,90,160,0.16)" }}>
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
          <Icon name="map-pin" size={12} color="var(--ice-400)" strokeWidth={2} />
          <span className="text-xs font-semibold truncate" style={{ color: "var(--text-tertiary)" }}>{post.meetPoint}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5 flex-1">
            {joinedUsers.slice(0, 5).map((u) => (
              <div key={u.id} className="rounded-full ring-2" style={{ boxShadow: "0 0 0 2px var(--bg-surface-1)" }}>
                <Avatar id={u.id} initials={u.avatar} size={22} />
              </div>
            ))}
            {joinedUsers.length > 0 && (
              <span className="ml-2.5 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>{post.takenSpots} riding</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[0.7rem] font-bold font-mono"
              style={{ color: isFull ? "var(--text-disabled)" : openSpots === 1 ? "var(--ember-400)" : "var(--text-tertiary)" }}
            >
              {isFull ? "full" : `${openSpots} open`}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onJoin?.(e); }}
              disabled={isFull && !isJoined}
              className="text-xs font-black px-4 py-2 rounded-full transition-all duration-120 active:scale-90"
              style={
                isJoined
                  ? { background: "var(--accent-primary-subtle)", color: "var(--ice-300)" }
                  : isFull
                  ? { background: "var(--bg-surface-2)", color: "var(--text-disabled)", opacity: 0.5 }
                  : { background: "var(--accent-primary)", color: "var(--text-on-accent)" }
              }
            >
              {isJoined ? "Joined" : "Join"}
            </button>
          </div>
        </div>
      </div>

      {/* Tap hint */}
      <div className="px-4 py-2 flex items-center justify-center gap-1.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <span className="text-[0.65rem] font-semibold" style={{ color: "var(--text-disabled)" }}>Tap for details &amp; profile</span>
        <Icon name="chevron-right" size={11} color="var(--text-disabled)" strokeWidth={2} />
      </div>
    </article>
  );
}
