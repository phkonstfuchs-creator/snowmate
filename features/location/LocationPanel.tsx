"use client";

import { hasBackgroundLocation } from "@/features/tracking/position-source";
import { useState, useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { initialsFor } from "@/features/profile/profile-input";
import { SHARE_DURATIONS, minutesSince, type FriendLocation, type ShareMinutes } from "./location";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const PAPER = "var(--paper-0)";
const PAPER_1 = "var(--paper-1)";
const RUST = "var(--rust)";

const noSubscription = () => () => {};

function ShareSheet({ onClose, onShare, busy }: {
  onClose: () => void;
  onShare: (minutes: ShareMinutes) => void;
  busy: boolean;
}) {
  useScrollLock();
  const t = useT();
  /* Store apps keep sharing with the screen locked (ADR 0031). */
  const background = useSyncExternalStore(noSubscription, hasBackgroundLocation, () => false);
  const { state, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [minutes, setMinutes] = useState<ShareMinutes>(60);

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={panelRef} className="sheet-panel paper-grain" data-state={state} role="dialog" aria-modal="true"
        aria-labelledby="share-location-title" tabIndex={-1}
        style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex items-start justify-between px-5 pt-6 pb-4" style={{ borderBottom: "var(--rule-thin)" }}>
          <h2 id="share-location-title" className="text-display-md" style={{ color: INK }}>{t("loc.shareTitle")}</h2>
          <button type="button" onClick={dismiss} aria-label={t("common.close")} className="-mr-2 flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color={INK} strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-4 px-5 pt-5">
          <ul className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--ink-1)" }}>
            <li className="flex gap-2"><Icon name="users" size={16} color={RUST} className="mt-0.5 flex-shrink-0" />{t("loc.whoSees")}</li>
            <li className="flex gap-2"><Icon name="clock" size={16} color={RUST} className="mt-0.5 flex-shrink-0" />{t("loc.howLong")}</li>
            <li className="flex gap-2"><Icon name="lock" size={16} color={RUST} className="mt-0.5 flex-shrink-0" />{t("loc.noHistory")}</li>
            <li className="flex gap-2"><Icon name="radio" size={16} color={RUST} className="mt-0.5 flex-shrink-0" />{t(background ? "loc.lockedToo" : "loc.appOpen")}</li>
          </ul>
          <fieldset>
            <legend className="text-mono-label mb-1.5" style={{ color: INK }}>{t("loc.duration")}</legend>
            <div className="grid grid-cols-3 gap-2">
              {SHARE_DURATIONS.map((option) => (
                <label key={option.minutes} className="flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-semibold"
                  style={{ border: minutes === option.minutes ? "var(--rule-thick)" : "var(--rule-thin)", background: minutes === option.minutes ? PAPER_1 : PAPER, color: INK }}>
                  <input type="radio" name="share-minutes" className="sr-only" checked={minutes === option.minutes}
                    onChange={() => setMinutes(option.minutes)} />
                  {t(option.label)}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" disabled={busy} onClick={() => onShare(minutes)}
            className="card-tap w-full py-4 font-display text-xl disabled:opacity-40"
            style={{ background: RUST, color: PAPER, border: "var(--rule-thick)" }}>
            {busy ? t("common.oneMoment") : t("loc.startSharing")}
          </button>
        </div>
      </div>
    </>
  );
}

export default function LocationPanel({
  sharingEnd,
  canShare = true,
  busy,
  error,
  friends,
  onShare,
  onStop,
  onFocusFriend,
  showFriends = true,
}: {
  showFriends?: boolean;
  sharingEnd: string | null;
  /* false under 16: no share button, a note instead. */
  canShare?: boolean;
  busy: boolean;
  error: string | null;
  friends: FriendLocation[] | null;
  onShare: (minutes: ShareMinutes) => Promise<boolean>;
  onStop: () => void;
  onFocusFriend: (friend: FriendLocation) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date();
  const until = sharingEnd
    ? new Intl.DateTimeFormat(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }).format(new Date(sharingEnd))
    : null;

  return (
    <section className="px-4 pt-4" aria-labelledby="live-location-title">
      <div className="p-3" style={{ border: "var(--rule-thick)", background: sharingEnd ? "rgba(47, 111, 178, 0.08)" : PAPER_1 }}>
        <div className="flex items-start gap-3">
          <Icon name="radio" size={20} color={sharingEnd ? "#2f6fb2" : INK_2} className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id="live-location-title" className="text-sm font-black" style={{ color: INK }}>
              {sharingEnd ? t("loc.sharingUntil", { time: until ?? "" }) : t("loc.title")}
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: INK_2 }}>
              {sharingEnd ? t("loc.sharingHint") : canShare ? t("loc.offHint") : t("loc.from16")}
            </p>
          </div>
          {sharingEnd ? (
            <button type="button" onClick={onStop} disabled={busy} className="text-mono-label min-h-11 px-3 disabled:opacity-50"
              style={{ border: "var(--rule-thin)", color: "var(--crimson)", background: PAPER }}>
              {t("loc.stop")}
            </button>
          ) : canShare && (
            <button type="button" onClick={() => setSheetOpen(true)} disabled={busy} className="text-mono-label min-h-11 px-3 disabled:opacity-50"
              style={{ background: "var(--rust)", color: "var(--on-accent)" }}>
              {t("loc.share")}
            </button>
          )}
        </div>
        {error && <p role="alert" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{error}</p>}
      </div>

      {showFriends && <div className="mt-4">
        <p className="mb-2 text-[0.65rem] font-black" style={{ color: "var(--text-tertiary)" }}>
          {t("loc.friendsOnMap", { n: friends?.length ?? 0 })}
        </p>
        {friends === null ? (
          <p className="text-sm" style={{ color: "var(--crimson)" }}>{t("loc.friendsUnavailable")}</p>
        ) : friends.length === 0 ? (
          <p className="text-sm" style={{ color: INK_2 }}>{t("loc.noFriendsSharing")}</p>
        ) : (
          <ul className="space-y-1.5">
            {friends.map((friend) => {
              const age = minutesSince(friend.updatedAt, now);
              return (
                <li key={friend.userId}>
                  <button type="button" onClick={() => onFocusFriend(friend)}
                    className="card-tap flex min-h-12 w-full items-center gap-3 px-3 text-left"
                    style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface-1)" }}>
                    <span className="friend-pin-badge" aria-hidden="true">{initialsFor(friend.name, friend.handle)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black" style={{ color: INK }}>{friend.name}</span>
                      <span className="block text-xs" style={{ color: INK_2 }}>
                        {age < 1 ? t("common.justNow") : t("common.minAgo", { n: age })}
                        {friend.handle ? ` · @${friend.handle}` : ""}
                      </span>
                    </span>
                    <Icon name="locate" size={16} color={INK_2} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>}

      {sheetOpen && (
        <ShareSheet
          busy={busy}
          onClose={() => setSheetOpen(false)}
          onShare={(minutes) => {
            void onShare(minutes).then((ok) => {
              if (ok) setSheetOpen(false);
            });
          }}
        />
      )}
    </section>
  );
}
