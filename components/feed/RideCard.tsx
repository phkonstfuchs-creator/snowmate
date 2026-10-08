"use client";

import { RidePost, User } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";
import Tag, { STYLE_LABEL } from "@/components/ui/Tag";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import { isFull, openSpots } from "@/features/rides/capacity";

interface RideCardProps {
  post: RidePost;
  author: User;
  joinedUsers: User[];
  isJoined: boolean;
  isPending?: boolean;
  isHost?: boolean;
  /* Host only: how many are asking to join */
  requestCount?: number;
  onClick: () => void;
  onJoin?: (e: React.MouseEvent) => void;
  index?: number;
}

export default function RideCard({ post, author, joinedUsers, isJoined, isPending = false, isHost = false, requestCount = 0, onClick, onJoin, index = 0 }: RideCardProps) {
  const t = useT();
  const open = openSpots(post);
  const full = isFull(post);

  return (
    <article
      className="card-tap anim-fade-up overflow-hidden"
      style={{
        animationDelay: `${index * 60}ms`,
        background: "var(--paper-1)",
        border: "var(--rule-thin)",
      }}
      onClick={onClick}
    >
      {/* Resort, meeting time and riding style in one quiet line */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold" style={{ color: "var(--ink-0)", letterSpacing: "-0.01em" }}>
            {post.resort}
          </p>
          <p className="text-mono-label mt-0.5" style={{ color: "var(--ink-2)" }}>{post.meetTime}</p>
        </div>
        <Tag level={post.abilityLevel} />
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
        {/* Wraps instead of clipping: on a narrow phone a long host
            status moves to its own line, right-aligned. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex min-w-0 items-center -space-x-1.5 flex-1">
            {joinedUsers.slice(0, 5).map((u) => (
              <div key={u.id} className="rounded-full" style={{ boxShadow: "0 0 0 2px var(--paper-1)" }}>
                <Avatar id={u.id} initials={u.avatar} size={22} />
              </div>
            ))}
            {joinedUsers.length > 0 && (
              <span className="ml-2.5 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>{t("card.in", { n: post.takenSpots })}</span>
            )}
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-3">
            <span
              className="whitespace-nowrap text-sm font-medium"
              style={{ color: full ? "var(--ink-3)" : open === 1 ? "var(--rust)" : "var(--ink-2)" }}
            >
              {full ? t("card.full") : t("card.open", { n: open })}
            </span>
            {isHost ? (
              <span className="flex min-h-11 min-w-0 items-center px-4 text-sm font-semibold" style={{ background: "var(--ochre)", color: "var(--on-bright)", borderRadius: 999 }}>
                {requestCount > 0 ? t("card.yourRideAsking", { n: requestCount }) : t("card.yourRide")}
              </span>
            ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onJoin?.(e); }}
              disabled={full && !isJoined && !isPending}
              /* Several cards say "I'm in": the name says which ride. */
              aria-label={t("card.actionFor", {
                action: isJoined ? t("card.joined") : isPending ? t("card.asked") : t("card.join"),
                resort: post.resort,
                style: t(STYLE_LABEL[post.abilityLevel]),
                time: post.meetTime,
              })}
              className="min-h-12 px-5 text-[0.9375rem] font-semibold transition-transform active:scale-[0.97]"
              style={
                isJoined || isPending
                  ? { background: "var(--paper-2)", color: "var(--ink-1)", borderRadius: 999 }
                  : full
                  ? { background: "var(--paper-2)", color: "var(--ink-3)", borderRadius: 999 }
                  : { background: "var(--rust)", color: "var(--on-accent)", borderRadius: 999 }
              }
            >
              {isJoined ? t("card.joined") : isPending ? t("card.asked") : t("card.join")}
            </button>
            )}
          </div>
        </div>
      </div>

    </article>
  );
}
