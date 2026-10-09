"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Switch from "@/components/ui/Switch";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { initialsFor } from "@/features/profile/profile-input";
import AgeSection from "@/features/profile/AgeSection";
import { openDirectChatAction } from "@/features/chat/actions";
import ReportBlockSheet from "@/features/safety/ReportBlockSheet";
import ConversationThread from "@/features/demo/ConversationThread";
import { deckAction, setDiscoverableAction, swipeAction } from "./actions";
import { swipeDirection, type DeckCard, type SwipeOutcome } from "./discovery";

const STYLE_LABEL: Record<string, MessageKey> = { chill: "common.chill", park: "common.park", "off-piste": "common.offPiste" };

const OUTCOME_ERROR: Partial<Record<SwipeOutcome, MessageKey>> = {
  rate_limited: "discover.rateLimited",
  unauthenticated: "profile.sessionEnded",
  unavailable: "discover.failed",
  invalid: "discover.riderUnavailable",
};

/* Meet riders by swiping (ADR 0028). Opt-in; separated by age; under 18
   only friends of friends. A match makes you friends. */
export default function DiscoverScreen({
  initialDeck,
  discoverable,
  hasBirthDate,
  isMinor,
  demo = false,
}: {
  initialDeck: DeckCard[] | null;
  discoverable: boolean | null;
  hasBirthDate: boolean;
  isMinor: boolean;
  /* /demo: fixtures only, nothing goes to the server (ADR 0003). A like
     with friends in common matches, to show the whole flow. */
  demo?: boolean;
}) {
  const t = useT();
  const [on, setOn] = useState(discoverable === true);
  const [deck, setDeck] = useState(initialDeck);
  const [match, setMatch] = useState<DeckCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<DeckCard | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setError(null);
    if (demo) {
      setOn(next);
      setDeck(next ? initialDeck : []);
      return;
    }
    startTransition(async () => {
      const ok = await setDiscoverableAction(next).catch(() => false);
      if (!ok) {
        setError(t("discover.failed"));
        return;
      }
      setOn(next);
      setDeck(next ? await deckAction().catch(() => null) : []);
    });
  };

  const decide = (card: DeckCard, liked: boolean) => {
    if (pending) return;
    setError(null);
    setDeck((current) => current?.filter((item) => item.userId !== card.userId) ?? current);
    if (demo) {
      if (liked && card.mutualFriends > 0) setMatch(card);
      return;
    }
    startTransition(async () => {
      const outcome = await swipeAction(card.userId, liked).catch((): SwipeOutcome => "unavailable");
      if (outcome === "matched") setMatch(card);
      const message = OUTCOME_ERROR[outcome];
      if (message) {
        setError(t(message));
        if (outcome !== "invalid") setDeck((current) => current && !current.some((item) => item.userId === card.userId) ? [card, ...current] : current);
      }
    });
  };

  const reload = () => (demo ? setDeck(initialDeck) : startTransition(async () => setDeck(await deckAction().catch(() => null))));
  const top = deck?.[0] ?? null;

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <h1 className="large-title" style={{ color: "var(--ink-0)" }}>{t("discover.title")}</h1>
            <p className="text-xs font-semibold" style={{ color: "var(--ink-2)" }}>{isMinor ? t("discover.subtitleMinor") : t("discover.subtitleAdult")}</p>
          </div>
        </div>
      </header>

      {!hasBirthDate ? (
        <div className="mt-5">
          <p className="mx-4 mb-4 text-sm" style={{ color: "var(--ink-1)" }}>{t("discover.needsAge")}</p>
          {!demo && <AgeSection birthDate={null} isMinor={isMinor} />}
        </div>
      ) : (
        <section className="mx-4 mt-4 flex items-center justify-between gap-3 px-4 py-3" style={{ background: "var(--paper-1)", border: "var(--rule-thin)" }} aria-busy={pending}>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--ink-0)" }}>{t("discover.visible")}</p>
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>{isMinor ? t("discover.rulesMinor") : t("discover.rulesAdult")}</p>
          </div>
          <Switch on={on} label={t("discover.visible")} disabled={pending || discoverable === null} onChange={toggle} />
        </section>
      )}

      {error && <p role="alert" className="mx-4 mt-3 text-sm" style={{ color: "var(--crimson)" }}>{error}</p>}

      {hasBirthDate && on && deck === null && <p role="status" className="mx-4 mt-5 text-sm" style={{ color: "var(--crimson)" }}>{t("discover.unavailable")}</p>}

      {hasBirthDate && on && deck !== null && !top && (
        <div className="mx-4 mt-8 text-center">
          <p className="font-semibold" style={{ color: "var(--ink-0)" }}>{t("discover.empty")}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{isMinor ? t("discover.emptyMinor") : t("discover.emptyAdult")}</p>
          {/* Under 18 the deck grows only with friends: invite one. */}
          {isMinor && (
            <Link href={demo ? "/demo/crew" : "/crew"} className="mt-4 flex min-h-12 items-center justify-center px-5 text-sm font-semibold" style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 999 }}>
              {t("discover.inviteFriend")}
            </Link>
          )}
          <button type="button" onClick={reload} className="mt-2 min-h-11 px-4 text-sm font-semibold" style={{ border: "var(--rule-thin)", color: "var(--ink-0)" }}>
            {t("discover.reload")}
          </button>
        </div>
      )}

      {hasBirthDate && on && top && (
        <SwipeCard key={top.userId} card={top} disabled={pending} onDecide={(liked) => decide(top, liked)} onReport={() => setReporting(top)} />
      )}

      {match && <MatchSheet card={match} demo={demo} onClose={() => setMatch(null)} />}
      {reporting && (
        <ReportBlockSheet
          target={{ userId: reporting.userId, name: reporting.name }}
          demo={demo}
          onClose={() => {
            setDeck((current) => current?.filter((item) => item.userId !== reporting.userId) ?? current);
            setReporting(null);
          }}
        />
      )}
    </div>
  );
}

function SwipeCard({ card, disabled, onDecide, onReport }: { card: DeckCard; disabled: boolean; onDecide: (liked: boolean) => void; onReport: () => void }) {
  const t = useT();
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number; dx: number; vertical: boolean } | null>(null);
  const hint = swipeDirection(dx);

  return (
    <section className="mx-4 mt-5 overflow-x-clip" aria-label={card.name} aria-busy={disabled}>
      <p className="mb-3 text-center text-xs" style={{ color: "var(--ink-2)" }}>{t("discover.swipeHint")}</p>
      <div
        className="discovery-card relative select-none px-5 py-6"
        style={{
          background: "var(--paper-1)",
          border: "var(--rule-thin)",
          transform: `translateX(${dx}px) rotate(${dx / 25}deg)`,
          transition: dragging ? "none" : "transform .25s ease",
          touchAction: "pan-y",
        }}
        onPointerDown={(event) => {
          if (disabled || event.button > 0 || (event.target instanceof Element && event.target.closest("button, a, input, select"))) return;
          start.current = { x: event.clientX, y: event.clientY, id: event.pointerId, dx: 0, vertical: false };
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const gesture = start.current;
          if (!gesture || gesture.id !== event.pointerId) return;
          const moveX = event.clientX - gesture.x;
          const moveY = event.clientY - gesture.y;
          const vertical = gesture.vertical || (Math.abs(moveY) > 8 && Math.abs(moveY) > Math.abs(moveX));
          const nextDx = vertical ? 0 : Math.max(-240, Math.min(240, moveX));
          start.current = { ...gesture, dx: nextDx, vertical };
          setDx(nextDx);
        }}
        onPointerUp={(event) => {
          if (start.current?.id !== event.pointerId) return;
          const decision = swipeDirection(start.current.dx);
          start.current = null;
          setDragging(false);
          setDx(0);
          if (decision && !disabled) onDecide(decision === "like");
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        {hint && (
          <span className="absolute right-4 top-4 px-2 py-1 text-xs font-bold" style={{ color: hint === "like" ? "var(--rust)" : "var(--ink-2)", border: "2px solid currentColor", borderRadius: 6 }} aria-hidden>
            {hint === "like" ? t("discover.like") : t("discover.pass")}
          </span>
        )}
        <div className="flex items-center gap-3">
          <Avatar id={card.userId} initials={initialsFor(card.name, null)} size={64} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold" style={{ color: "var(--ink-0)" }}>{card.name}</h2>
            {card.mutualFriends > 0 && (
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t(card.mutualFriends === 1 ? "discover.mutualOne" : "discover.mutual", { n: card.mutualFriends })}</p>
            )}
          </div>
        </div>
        {card.ridingStyles.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("discover.styles")}>
            {card.ridingStyles.map((style) => (
              <li key={style} className="px-3 py-1 text-xs font-semibold" style={{ background: "var(--paper-2)", borderRadius: 999, color: "var(--ink-1)" }}>
                {STYLE_LABEL[style] ? t(STYLE_LABEL[style]) : style}
              </li>
            ))}
          </ul>
        )}
        {card.bio && <p className="mt-4 whitespace-pre-wrap break-words text-[0.95rem] leading-snug" style={{ color: "var(--ink-1)" }}>{card.bio}</p>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" disabled={disabled} onClick={() => onDecide(false)} aria-label={t("discover.passLabel", { name: card.name })} className="flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold disabled:opacity-50" style={{ border: "var(--rule-thin)", background: "var(--paper-0)" }}>
          {t("discover.pass")}
        </button>
        <button type="button" disabled={disabled} onClick={() => onDecide(true)} aria-label={t("discover.likeLabel", { name: card.name })} className="flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold disabled:opacity-50" style={{ background: "var(--rust)", color: "var(--on-accent)" }}>
          {t("discover.like")}
        </button>
      </div>
      <div className="mt-3 text-center">
        <button type="button" onClick={onReport} className="min-h-11 text-xs font-semibold underline" style={{ color: "var(--ink-2)" }}>
          {t("chat.reportOrBlock", { name: card.name })}
        </button>
      </div>
    </section>
  );
}

function MatchSheet({ card, demo, onClose }: { card: DeckCard; demo: boolean; onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [demoChat, setDemoChat] = useState(false);
  if (demoChat) return <ConversationThread userId={card.userId} onClose={onClose} />;
  return (
    <>
      <div className="sheet-overlay" data-state="open" onClick={onClose} aria-hidden />
      <div className="sheet-panel px-5 pb-6 pt-6 text-center" data-state="open" role="dialog" aria-modal="true" aria-label={t("discover.matchTitle")}>
        <div className="flex justify-center">
          <Avatar id={card.userId} initials={initialsFor(card.name, null)} size={72} />
        </div>
        <h2 className="text-display-md mt-4">{t("discover.matchTitle")}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{t("discover.matchText", { name: card.name })}</p>
        {demo ? (
          /* The demo thread works with any sample rider, so the match opens it here. */
          <button
            type="button"
            onClick={() => setDemoChat(true)}
            className="mt-5 flex min-h-12 w-full items-center justify-center text-sm font-semibold"
            style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 12 }}
          >
            {t("discover.writeMessage")}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void openDirectChatAction(card.userId).finally(() => setBusy(false));
            }}
            className="mt-5 flex min-h-12 w-full items-center justify-center text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 12 }}
          >
            {t("discover.writeMessage")}
          </button>
        )}
        <button type="button" onClick={onClose} className="mt-2 min-h-11 w-full text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
          {t("discover.keepSwiping")}
        </button>
      </div>
    </>
  );
}
