"use client";

import { useState } from "react";
import { RidePost, User } from "@/lib/types";
import UserProfileSheet from "@/components/UserProfileSheet";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import ResortScene from "@/components/ResortScene";
import Avatar from "@/components/ui/Avatar";
import Tag from "@/components/ui/Tag";
import Icon from "@/components/ui/Icon";

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
}

export default function RideDetailSheet({ post, author, joinedUsers, onClose, onJoin, isJoined }: Props) {
  useScrollLock();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss, selectedUser === null);
  const openSpots = post.totalSpots - post.takenSpots;
  const isFull = openSpots <= 0;

  if (selectedUser) {
    return <UserProfileSheet user={selectedUser} onClose={() => setSelectedUser(null)} />;
  }

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-label="Ride details" tabIndex={-1} style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom, 16px), 24px)" }}>
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
          <button className="flex items-center gap-3" onClick={() => setSelectedUser(author)}>
            <Avatar id={author.id} initials={author.avatar} size={42} verified={author.accountType === "verified"} />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[0.9375rem]" style={{ color: INK }}>{author.name}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: MUTED }}>@{author.handle} · Lv {author.level} · {post.postedAt}</span>
            </div>
          </button>
          <button onClick={dismiss} aria-label="Close ride details" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: BORDER }}>
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
        <div className="mx-5 my-4 rounded-none overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="px-4 py-3" style={{ borderRight: `1px solid ${BORDER}` }}>
              <p className="text-xs font-bold mb-0.5" style={{ color: MUTED }}>Time</p>
              <p className="font-black text-sm font-mono" style={{ color: INK }}>{post.meetTime}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-bold mb-0.5" style={{ color: MUTED }}>Open spots</p>
              <p className="font-black text-sm font-mono" style={{ color: isFull ? MUTED : openSpots === 1 ? "var(--rust)" : BRAND }}>
                {isFull ? "Full" : `${openSpots} open`}
              </p>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-bold mb-0.5" style={{ color: MUTED }}>Meeting point</p>
            <p className="font-black text-sm" style={{ color: INK }}>{post.meetPoint}</p>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="px-5 pb-4 text-sm font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>{post.caption}</p>
        )}

        {/* Riders */}
        <div className="px-5 pt-2 pb-2" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-[0.65rem] font-black uppercase mb-3 mt-3" style={{ color: MUTED }}>Going ({post.takenSpots})</p>
          <div className="space-y-2.5">
            <button className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity" onClick={() => setSelectedUser(author)}>
              <Avatar id={author.id} initials={author.avatar} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm" style={{ color: INK }}>{author.name}</span>
                  <span className="text-mono-label px-1.5" style={{ background: "var(--ochre)", color: "var(--ink-0)" }}>Host</span>
                </div>
                <span className="text-xs font-bold" style={{ color: MUTED }}>Level {author.level} · {author.levelTitle}</span>
              </div>
              <Icon name="chevron-right" size={13} color={MUTED} strokeWidth={2} />
            </button>

            {joinedUsers.map((u) => (
              <button key={u.id} className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity" onClick={() => setSelectedUser(u)}>
                <Avatar id={u.id} initials={u.avatar} size={36} />
                <div className="flex-1 min-w-0">
                  <span className="font-black text-sm block" style={{ color: INK }}>{u.name}</span>
                  <span className="text-xs font-bold" style={{ color: MUTED }}>Level {u.level} · {u.levelTitle}</span>
                </div>
                <Icon name="chevron-right" size={13} color={MUTED} strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>

        {/* Join CTA */}
        <div className="px-5 pt-4">
          <button
            onClick={onJoin}
            disabled={isFull && !isJoined}
            className="w-full py-4 font-black text-base transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px]"
            style={isJoined
              ? { background: "var(--accent-primary-subtle)", color: BRAND }
              : isFull
              ? { background: "var(--bg-surface-2)", color: MUTED, opacity: 0.5 }
              : { background: BRAND, color: "var(--text-on-accent)" }
            }
          >
            {isJoined ? "You are in, tap to leave" : isFull ? "Ride is full" : "Join ride"}
          </button>
        </div>
      </div>
    </>
  );
}
