"use client";

import { RidePost, User } from "@/lib/types";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import ResortScene from "@/components/ResortScene";
import Avatar from "@/components/ui/Avatar";
import Tag from "@/components/ui/Tag";
import Icon from "@/components/ui/Icon";
import { isFull, openSpots } from "@/features/rides/capacity";
import { useT } from "@/lib/i18n/client";

const BORDER = "var(--border-subtle)";
const MUTED = "var(--text-tertiary)";
const INK = "var(--text-primary)";
const BRAND = "var(--accent-primary)";

interface Props {
  post: RidePost;
  author: User;
  joinedUsers: User[];
  onClose: () => void;
  onJoin?: () => void;
  isJoined: boolean;
  isPending?: boolean;
  /* Host only: friends of friends asking to join. */
  requests?: User[];
  onRespond?: (userId: string, accept: boolean) => void;
  isHost?: boolean;
  onCancel?: () => void;
  onEdit?: () => void;
  /* Live only: open the report/block sheet for someone on this ride. */
  onSafety?: (user: User) => void;
  /* Opens a rider's profile. Only the demo passes it: real accounts do
     not have profile pages yet, so the rows are plain text there instead
     of buttons that do nothing. The sheet itself never loads fixtures. */
  onOpenProfile?: (user: User) => void;
  /* Live only, for the host and accepted riders: open the ride chat. */
  onOpenChat?: () => void;
}

/* A rider: a button when there is a profile to open, otherwise text. */
function PersonRow({ onOpen, className, children }: { onOpen?: () => void; className: string; children: React.ReactNode }) {
  return onOpen ? (
    <button type="button" className={className} onClick={onOpen}>{children}</button>
  ) : (
    <div className={className}>{children}</div>
  );
}

export default function RideDetailSheet({ post, author, joinedUsers, onClose, onJoin, isJoined, isPending = false, requests = [], onRespond, isHost = false, onCancel, onEdit, onSafety, onOpenProfile, onOpenChat }: Props) {
  useScrollLock();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const profilesEnabled = onOpenProfile !== undefined;
  const t = useT();
  const open = openSpots(post);
  const full = isFull(post);

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-label={t("ride.details")} tabIndex={-1} style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom, 16px), 24px)" }}>
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>

        {/* Resort scene hero */}
        <div className="mx-5 mt-4" style={{ border: "var(--rule-thin)" }}>
          <div className="relative overflow-hidden" style={{ height: 108 }}>
            <ResortScene name={post.resort} className="absolute inset-0 w-full h-full" />
            <span
              className="text-mono-label absolute left-0 top-0 px-2 py-1"
              style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}
            >
              {post.meetTime}
            </span>
            <div className="absolute right-2 top-2">
              <Tag level={post.abilityLevel} />
            </div>
          </div>
          <div
            className="px-3 py-2"
            style={{ background: "var(--paper-0)", borderTop: "var(--rule-thin)" }}
          >
            <p className="font-display text-base uppercase" style={{ color: INK, letterSpacing: 0 }}>
              {post.resort}
            </p>
            <p className="text-mono-label mt-0.5" style={{ color: MUTED }}>{post.meetPoint}</p>
          </div>
        </div>

        {/* Author header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <PersonRow className="flex items-center gap-3" onOpen={onOpenProfile && (() => onOpenProfile(author))}>
            <Avatar id={author.id} initials={author.avatar} size={42} verified={author.accountType === "verified"} />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[0.9375rem]" style={{ color: INK }}>{author.name}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: MUTED }}>@{author.handle} {profilesEnabled ? ` · Lv ${author.level}` : ""} · {post.postedAt}</span>
            </div>
          </PersonRow>
          <button onClick={dismiss} aria-label={t("ride.closeDetails")} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: BORDER }}>
            <Icon name="x" size={14} color={MUTED} strokeWidth={2} />
          </button>
        </div>

        {/* Author bio + social */}
        {author.bio && (
          <p className="px-5 py-3 text-sm font-medium leading-snug" style={{ color: "var(--text-secondary)", borderBottom: `1px solid ${BORDER}` }}>{author.bio}</p>
        )}
        {(author.instagram || author.snapchat) && (
          <div className="flex gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {author.instagram && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1" style={{ background: "rgba(200,90,160,0.14)", color: "#e59ecb", border: `1px solid rgba(200,90,160,0.3)` }}>
                <Icon name="instagram" size={11} />
                {author.instagram}
              </span>
            )}
            {author.snapchat && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1" style={{ background: "var(--accent-warm-subtle)", color: "var(--rust-ink)", border: `1px solid var(--rust-ink)` }}>
                {author.snapchat}
              </span>
            )}
          </div>
        )}

        {/* Details grid */}
        <div className="mx-5 my-4 rounded-[14px] overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="px-4 py-3" style={{ borderRight: `1px solid ${BORDER}` }}>
              <p className="text-xs font-bold mb-0.5" style={{ color: MUTED }}>{t("ride.time")}</p>
              <p className="font-black text-sm font-mono" style={{ color: INK }}>{post.meetTime}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-bold mb-0.5" style={{ color: MUTED }}>{t("ride.openSpots")}</p>
              <p className="font-black text-sm font-mono" style={{ color: full ? MUTED : open === 1 ? "var(--rust)" : BRAND }}>
                {full ? t("ride.full") : t("card.open", { n: open })}
              </p>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-bold mb-0.5" style={{ color: MUTED }}>{t("ride.meetingPoint")}</p>
            <p className="font-black text-sm" style={{ color: INK }}>{post.meetPoint}</p>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="px-5 pb-4 text-sm font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>{post.caption}</p>
        )}

        {/* Riders */}
        <div className="px-5 pt-2 pb-2" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-[0.65rem] font-black uppercase mb-3 mt-3" style={{ color: MUTED }}>{t("ride.going", { n: post.takenSpots })}</p>
          <div className="space-y-2.5">
            <PersonRow className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity" onOpen={onOpenProfile && (() => onOpenProfile(author))}>
              <Avatar id={author.id} initials={author.avatar} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm" style={{ color: INK }}>{author.name}</span>
                  <span className="text-mono-label px-1.5" style={{ background: "var(--ochre)", color: "var(--on-bright)" }}>{t("ride.host")}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: MUTED }}>{profilesEnabled ? t("ride.levelLine", { level: author.level, title: author.levelTitle }) : author.handle ? `@${author.handle}` : ""}</span>
              </div>
              {profilesEnabled && <Icon name="chevron-right" size={13} color={MUTED} strokeWidth={2} />}
            </PersonRow>

            {joinedUsers.map((u) => (
              <PersonRow key={u.id} className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity" onOpen={onOpenProfile && (() => onOpenProfile(u))}>
                <Avatar id={u.id} initials={u.avatar} size={36} />
                <div className="flex-1 min-w-0">
                  <span className="font-black text-sm block" style={{ color: INK }}>{u.name}</span>
                  <span className="text-xs font-bold" style={{ color: MUTED }}>{profilesEnabled ? t("ride.levelLine", { level: u.level, title: u.levelTitle }) : u.handle ? `@${u.handle}` : ""}</span>
                </div>
                {profilesEnabled && <Icon name="chevron-right" size={13} color={MUTED} strokeWidth={2} />}
              </PersonRow>
            ))}
          </div>
        </div>

        {isHost && requests.length > 0 && (
          <div className="px-5 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-[0.65rem] font-black uppercase mb-3 mt-3" style={{ color: MUTED }}>
              {t("ride.asking", { n: requests.length })}
            </p>
            <div className="space-y-2">
              {requests.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar id={u.id} initials={u.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black" style={{ color: INK }}>{u.name}</span>
                    {u.handle && <span className="text-xs font-bold" style={{ color: MUTED }}>{t("ride.friendOfFriend", { handle: u.handle })}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRespond?.(u.id, true)}
                    disabled={full}
                    className="text-mono-label min-h-11 px-3 disabled:opacity-40"
                    style={{ background: "var(--pine)", color: "var(--paper-0)" }}
                  >
                    {t("ride.letIn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRespond?.(u.id, false)}
                    aria-label={t("common.declineName", { name: u.name })}
                    className="flex h-11 w-11 items-center justify-center"
                    style={{ border: `1px solid ${BORDER}` }}
                  >
                    <Icon name="x" size={14} color={MUTED} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join CTA */}
        <div className="px-5 pt-4">
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="mb-2 flex w-full items-center justify-center gap-2 py-4 font-black text-base"
              style={{ background: "var(--paper-1)", color: "var(--ink-0)", border: "var(--rule-thick)" }}
            >
              <Icon name="message-circle" size={18} color="var(--ink-0)" strokeWidth={2.2} />
              {t("chat.rideChat")}
            </button>
          )}
          {isHost && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="mb-2 w-full py-4 font-black text-base"
              style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}
            >
              {t("ride.edit")}
            </button>
          )}
          {isHost ? (
            <button
              onClick={onCancel}
              disabled={!onCancel}
              className="w-full py-4 font-black text-base"
              style={{ background: "var(--bg-surface-2)", color: "var(--crimson)", border: "1px solid var(--crimson)" }}
            >
              {onCancel ? t("ride.cancel") : t("ride.hosting")}
            </button>
          ) : (
          <button
            onClick={onJoin}
            disabled={full && !isJoined && !isPending}
            className="w-full py-4 font-black text-base transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px]"
            style={isJoined || isPending
              ? { background: "var(--accent-primary-subtle)", color: BRAND }
              : full
              ? { background: "var(--bg-surface-2)", color: MUTED, opacity: 0.5 }
              : { background: BRAND, color: "var(--text-on-accent)" }
            }
          >
            {isJoined
              ? t("ride.inTapToLeave")
              : isPending
                ? t("ride.askedTapToWithdraw")
                : full
                  ? t("ride.isFull")
                  : t("ride.join")}
          </button>
          )}
        </div>
        {onSafety && !isHost && (
          <div className="px-5 pt-3 text-center">
            <button
              type="button"
              onClick={() => onSafety(author)}
              className="min-h-11 text-xs font-semibold underline"
              style={{ color: MUTED }}
            >
              {t("ride.reportOrBlock", { name: author.name })}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
