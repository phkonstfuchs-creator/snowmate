"use client";

import { useMemo, useState } from "react";
import { City } from "@/lib/types";
import { PUBLIC_EVENTS } from "@/lib/data";
import { isDiscoverablePublicRide } from "@/features/rides/visibility";
import type { LiveRide } from "./live-ride";
import { useRideBoard } from "./useRideBoard";
import { isClosedTo, isFull, openSpots, totalOpenSpots } from "./capacity";
import EditRideSheet from "./EditRideSheet";
import { useT } from "@/lib/i18n/client";
import { translateText } from "@/lib/i18n/translate";
import ReportBlockSheet from "@/features/safety/ReportBlockSheet";
import type { SafetyTarget } from "@/features/safety/reports";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import ResortScene from "@/components/ResortScene";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Tag from "@/components/ui/Tag";
import Icon from "@/components/ui/Icon";

const PAPER_1 = "var(--paper-1)";
const INK = "var(--ink-0)";
const INK_1 = "var(--ink-1)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PINE = "var(--pine)";
const OCHRE = "var(--ochre)";

/* The meeting-point lock. Visibly closed rather than simply left
   out: someone who has not joined should understand that something
   is there and why it is missing. Omitting it would read as a bug,
   a lock explains the rule. */
function MeetingPoint({ value, locked }: { value: string | null; locked: boolean }) {
  const t = useT();
  if (!locked && value) {
    return (
      <div className="flex items-start gap-2">
        <Icon name="map-pin" size={14} color={PINE} strokeWidth={1.9} className="mt-0.5 flex-shrink-0" />
        <p className="text-sm" style={{ color: INK }}>{value}</p>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5"
      style={{ background: PAPER_1, border: "1px dashed var(--paper-3)" }}
    >
      <Icon name="lock" size={14} color={INK_2} strokeWidth={1.9} className="mt-0.5 flex-shrink-0" />
      <p className="text-sm leading-snug" style={{ color: INK_2 }}>
        {t("events.lockedPoint")}
      </p>
    </div>
  );
}

function EventDetailSheet({
  ride,
  pending,
  onJoin,
  onCancel,
  onEdit,
  onSafety,
  onClose,
}: {
  ride: LiveRide;
  pending: boolean;
  onJoin: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  onSafety?: () => void;
  onClose: () => void;
}) {
  useScrollLock();
  const t = useT();
  const { state, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);

  const { post, host: author, participants: joinedUsers, isJoined, isHost } = ride;
  const taken = post.takenSpots;
  const open = openSpots(post);
  const full = isFull(post);

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div
        ref={panelRef}
        className="sheet-panel paper-grain"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={t("events.eventLabel", { name: post.title ?? post.resort })}
        tabIndex={-1}
        style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}
      >
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: "var(--paper-3)" }} />
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("events.close")}
          className="absolute right-3 top-2 z-10 flex h-11 w-11 items-center justify-center"
        >
          <Icon name="x" size={18} color={INK_2} strokeWidth={2} />
        </button>

        <div className="relative mx-5 mt-4 overflow-hidden" style={{ height: 132, border: "var(--rule-thin)" }}>
          <ResortScene name={post.resort} className="absolute inset-0 h-full w-full" />
          <span
            className="text-mono-label absolute left-0 top-0 px-2 py-1"
            style={{ background: OCHRE, color: "var(--on-bright)" }}
          >
            {t("events.public")}
          </span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-mono-label" style={{ color: RUST }}>
            {post.date} · {post.meetTime}
          </p>
          <h2 className="text-display-md mt-1.5" style={{ color: INK }}>
            {post.title ?? post.resort}
          </h2>
          {/* Resort only when the title does not already name it,
              otherwise "Axamer Lizum" appears twice in a row. */}
          {!(post.title ?? "").toLowerCase().includes(post.resort.toLowerCase()) && (
            <p className="mt-1 text-sm" style={{ color: INK_2 }}>
              {post.resort}
            </p>
          )}
        </div>

        <div className="mx-5 mt-4 flex items-center gap-3 py-3" style={{ borderTop: "var(--rule-thin)", borderBottom: "var(--rule-thin)" }}>
          <Avatar id={author.id} initials={author.avatar} size={38} verified={author.accountType === "verified"} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-semibold" style={{ color: INK }}>{author.name}</p>
            <p className="text-sm" style={{ color: INK_2 }}>
              {isHost ? t("ride.hosting") : author.handle ? t("events.hostHandle", { handle: author.handle }) : t("events.hostLevel", { level: author.level })}
            </p>
          </div>
          <Tag level={post.abilityLevel} />
        </div>

        {post.caption && (
          <p className="px-5 pt-4 text-sm leading-relaxed" style={{ color: INK_1 }}>
            {post.caption}
          </p>
        )}

        <div className="px-5 pt-4">
          <p className="text-mono-label mb-2" style={{ color: INK_2 }}>{t("ride.meetingPoint")}</p>
          <MeetingPoint value={ride.meetPointLocked ? null : post.meetPoint} locked={ride.meetPointLocked} />
        </div>

        <div className="mx-5 mt-4 grid grid-cols-2" style={{ border: "var(--rule-thin)" }}>
          <div className="px-4 py-3" style={{ borderRight: "1px solid var(--border-hairline)" }}>
            <p className="text-mono-label" style={{ color: INK_2 }}>{t("events.signedUp")}</p>
            <p className="text-mono-data mt-0.5" style={{ color: INK }}>
              {taken}/{post.totalSpots}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-mono-label" style={{ color: INK_2 }}>{t("events.open")}</p>
            <p className="text-mono-data mt-0.5" style={{ color: full ? INK_2 : PINE }}>
              {full ? t("card.full") : open}
            </p>
          </div>
        </div>

        {joinedUsers.length > 0 && (
          <div className="px-5 pt-4">
            <p className="text-mono-label mb-2" style={{ color: INK_2 }}>
              {t("events.among")}
            </p>
            <div className="flex flex-wrap gap-2">
              {joinedUsers.map((user) => (
                <span
                  key={user.id}
                  className="flex items-center gap-1.5 px-2 py-1"
                  style={{ background: PAPER_1, border: "1px solid var(--border-hairline)" }}
                >
                  <Avatar id={user.id} initials={user.avatar} size={20} />
                  <span className="text-sm" style={{ color: INK_1 }}>{user.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 pt-5">
          {isHost && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="card-tap mb-2 w-full py-4 font-display text-lg uppercase"
              style={{ background: INK, color: "var(--paper-0)", border: "var(--rule-thick)" }}
            >
              {t("events.edit")}
            </button>
          )}
          {isHost && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="w-full py-4 font-display text-lg uppercase disabled:opacity-40"
              style={{ background: PAPER_1, color: "var(--crimson)", border: "1px solid var(--crimson)" }}
            >
              {t("events.cancel")}
            </button>
          )}
          {!isHost && (
          <button
            onClick={onJoin}
            disabled={(full && !isJoined) || pending}
            className="card-tap w-full py-4 font-display text-lg uppercase"
            style={
              isJoined
                ? { background: PAPER_1, color: INK, border: "var(--rule-thick)" }
                : full
                  ? { background: PAPER_1, color: INK_2, border: "var(--rule-thin)", cursor: "not-allowed" }
                  : { background: RUST, color: "var(--paper-0)", border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }
            }
          >
            {pending ? t("common.oneMoment") : isJoined ? t("events.leave") : full ? t("events.isFull") : t("events.join")}
          </button>
          )}
        </div>
        {onSafety && !isHost && (
          <div className="px-5 pt-3 text-center">
            <button type="button" onClick={onSafety} className="min-h-11 text-xs font-semibold underline" style={{ color: INK_2 }}>
              {t("ride.reportOrBlock", { name: author.name })}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function EventCard({
  ride,
  index,
  onOpen,
}: {
  ride: LiveRide;
  index: number;
  onOpen: () => void;
}) {
  const t = useT();
  const { post, host: author, isJoined } = ride;
  const taken = post.takenSpots;
  const open = openSpots(post);
  const full = isFull(post);
  const filled = Math.min(100, Math.round((taken / post.totalSpots) * 100));

  return (
    <button
      onClick={onOpen}
      className="card-tap anim-fade-up block w-full text-left"
      style={{
        background: "var(--paper-0)",
        border: "var(--rule-thin)",
        boxShadow: "var(--shadow-print)",
        animationDelay: `${index * 45}ms`,
      }}
    >
      <div className="relative h-24 overflow-hidden" style={{ borderBottom: "var(--rule-thin)" }}>
        <ResortScene name={post.resort} className="absolute inset-0 h-full w-full" />
        <span
          className="text-mono-label absolute left-0 top-0 px-2 py-1"
          style={{ background: OCHRE, color: "var(--on-bright)" }}
        >
          {post.date}
        </span>
        {isJoined && (
          <span
            className="text-mono-label absolute right-0 top-0 px-2 py-1"
            style={{ background: PINE, color: "var(--paper-0)" }}
          >
            {t("events.joined")}
          </span>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[1.0625rem] font-semibold leading-snug" style={{ color: INK }}>
            {post.title ?? post.resort}
          </h2>
          <Tag level={post.abilityLevel} />
        </div>

        {/* The resort is the public information here — it stays on
            the card unless the title already carries it. */}
        <p className="mt-1 text-sm" style={{ color: INK_2 }}>
          {(post.title ?? "").toLowerCase().includes(post.resort.toLowerCase())
            ? `${post.meetTime} · ${author.name}`
            : `${post.resort} · ${post.meetTime} · ${author.name}`}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1" style={{ background: "var(--paper-2)", border: "1px solid var(--border-hairline)" }}>
            <div style={{ width: `${filled}%`, height: "100%", background: full ? INK_2 : RUST }} />
          </div>
          <span className="text-mono-label flex-shrink-0" style={{ color: full ? INK_2 : INK }}>
            {full ? t("card.full") : t("card.open", { n: open })}
          </span>
        </div>
      </div>
    </button>
  );
}

export interface LiveEvents {
  /* null when the backend could not be reached */
  rides: LiveRide[] | null;
  defaultCity: City;
}


/* `live` is undefined in the /demo prototype, which runs on fixtures. */
export default function EventsScreen({ live }: { live?: LiveEvents } = {}) {
  const t = useT();
  const [city, setCity] = useState<City>(live?.defaultCity ?? "innsbruck");
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  const board = useRideBoard(live ? live.rides ?? [] : undefined, PUBLIC_EVENTS);
  const unavailable = live !== undefined && live.rides === null;

  /* Filtering runs through isDiscoverablePublicRide rather than a
     plain visibility comparison, so a wrongly flagged ride hosted by
     a minor drops out too. The database applies the same rule; this
     is the second line. */
  const events = useMemo(
    () =>
      board.rides
        .filter((ride) => ride.post.city === city && isDiscoverablePublicRide(ride.post, ride.host))
        /* Full events go last. This screen is the entry point for
           people without contacts, so the top must show where you can
           still join, not where you are too late. */
        .sort((a, b) => Number(isClosedTo(a.post, a.isJoined)) - Number(isClosedTo(b.post, b.isJoined))),
    [board.rides, city],
  );

  const openEvent = events.find((event) => event.post.id === openEventId) ?? null;
  const editingEvent = events.find((event) => event.post.id === editingEventId) ?? null;
  const openSeats = totalOpenSpots(events.map((event) => event.post));

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>
            {t("events.title")}
          </h1>
          <p className="mt-0.5 text-xs font-semibold" style={{ color: INK_2 }}>
            {t("events.summary", { events: events.length, spots: openSeats })}
          </p>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]}
            value={city}
            onChange={setCity}
            ariaLabel={t("common.region")}
          />
        </div>
      </header>

      {/* States the visibility rule where it applies. Strangers read
          along here, so the rule belongs on the screen rather than in
          a help page. */}
      <div
        className="mx-4 mt-4 flex items-start gap-3 px-4 py-3"
        style={{ background: PAPER_1, border: "var(--rule-thin)" }}
      >
        <Icon name="globe" size={16} color={PINE} strokeWidth={1.7} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-mono-label" style={{ color: INK }}>{t("events.openToAll")}</p>
          <p className="mt-1 text-sm leading-snug" style={{ color: INK_1 }}>
            {t("events.openToAllHint")}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4 pb-6">
        {(board.notice || unavailable) && (
          <p role="status" className="px-3 py-2.5 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)", background: PAPER_1 }}>
            {board.notice ? translateText(t, board.notice) : t("events.unavailable")}
          </p>
        )}

        {events.map((event, index) => (
          <EventCard
            key={event.post.id}
            ride={event}
            index={index}
            onOpen={() => setOpenEventId(event.post.id)}
          />
        ))}

        {events.length === 0 && !unavailable && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Icon name="calendar-days" size={30} color={INK_2} strokeWidth={1.5} />
            <div>
              <p className="font-semibold" style={{ color: INK }}>
                {t("events.empty")}
              </p>
              <p className="mt-1 text-sm" style={{ color: INK_2 }}>
                {t("events.emptyHint")}
              </p>
            </div>
          </div>
        )}
      </div>

      {openEvent && (
        <EventDetailSheet
          ride={openEvent}
          pending={board.pendingId === openEvent.post.id}
          onJoin={() => { void board.toggleJoin(openEvent.post.id); }}
          {...(board.isLive
            ? {
                onSafety: () => {
                  setOpenEventId(null);
                  setSafetyTarget({ userId: openEvent.host.id, name: openEvent.host.name, rideId: openEvent.post.id });
                },
                onEdit: () => {
                  setOpenEventId(null);
                  setEditingEventId(openEvent.post.id);
                },
                onCancel: () => {
                  if (!window.confirm(t("events.confirmCancel"))) return;
                  setOpenEventId(null);
                  void board.cancelRide(openEvent.post.id);
                },
              }
            : {})}
          onClose={() => setOpenEventId(null)}
        />
      )}

      {safetyTarget && <ReportBlockSheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />}

      {editingEvent && (
        <EditRideSheet
          post={editingEvent.post}
          onSave={(input) => board.updateRide(editingEvent.post.id, input)}
          onClose={() => setEditingEventId(null)}
        />
      )}
    </>
  );
}
