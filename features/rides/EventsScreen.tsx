"use client";

import { useMemo, useState } from "react";
import { City, RidePost, User } from "@/lib/types";
import { PUBLIC_EVENTS, getUserById, getUsersByIds, ME } from "@/lib/data";
import { isDiscoverablePublicRide, toVisibleRide } from "@/features/rides/visibility";
import { toggleSetValue } from "@/lib/collections";
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

/* Der Treffpunkt-Riegel. Sichtbar verschlossen statt einfach
   weggelassen: Wer nicht beigetreten ist, soll verstehen, dass da
   etwas ist und warum es fehlt. Weglassen wuerde wie ein Fehler
   wirken, ein Schloss erklaert die Regel. */
function MeetingPoint({ value, locked }: { value: string | null; locked: boolean }) {
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
        Genauer Treffpunkt wird nach der Zusage sichtbar.
      </p>
    </div>
  );
}

function EventDetailSheet({
  post,
  author,
  joinedUsers,
  isJoined,
  onJoin,
  onClose,
}: {
  post: RidePost;
  author: User;
  joinedUsers: User[];
  isJoined: boolean;
  onJoin: () => void;
  onClose: () => void;
}) {
  useScrollLock();
  const { state, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);

  const view = toVisibleRide(post, {
    viewer: ME,
    author,
    isJoined,
    friendIds: ME.friendIds,
  });
  const taken = post.takenSpots + (isJoined ? 1 : 0);
  const openSpots = post.totalSpots - taken;
  const isFull = openSpots <= 0;

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div
        ref={panelRef}
        className="sheet-panel paper-grain"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={`Event: ${post.title ?? post.resort}`}
        tabIndex={-1}
        style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}
      >
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: "var(--paper-3)" }} />
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Event schließen"
          className="absolute right-3 top-2 z-10 flex h-11 w-11 items-center justify-center"
        >
          <Icon name="x" size={18} color={INK_2} strokeWidth={2} />
        </button>

        <div className="relative mx-5 mt-4 overflow-hidden" style={{ height: 132, border: "var(--rule-thin)" }}>
          <ResortScene name={post.resort} className="absolute inset-0 h-full w-full" />
          <span
            className="text-mono-label absolute left-0 top-0 px-2 py-1"
            style={{ background: OCHRE, color: INK }}
          >
            Öffentlich
          </span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-mono-label" style={{ color: RUST }}>
            {post.date} · {post.meetTime}
          </p>
          <h2 className="text-display-md mt-1.5" style={{ color: INK }}>
            {post.title ?? post.resort}
          </h2>
          {/* Gebiet nur, wenn der Titel es nicht ohnehin nennt —
              sonst steht "Axamer Lizum" zweimal untereinander. */}
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
              Gastgeber · Stufe {author.level}
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
          <p className="text-mono-label mb-2" style={{ color: INK_2 }}>Treffpunkt</p>
          <MeetingPoint value={view.meetPoint} locked={view.meetPointLocked} />
        </div>

        <div className="mx-5 mt-4 grid grid-cols-2" style={{ border: "var(--rule-thin)" }}>
          <div className="px-4 py-3" style={{ borderRight: "1px solid var(--border-hairline)" }}>
            <p className="text-mono-label" style={{ color: INK_2 }}>Angemeldet</p>
            <p className="text-mono-data mt-0.5" style={{ color: INK }}>
              {taken}/{post.totalSpots}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-mono-label" style={{ color: INK_2 }}>Frei</p>
            <p className="text-mono-data mt-0.5" style={{ color: isFull ? INK_2 : PINE }}>
              {isFull ? "voll" : openSpots}
            </p>
          </div>
        </div>

        {joinedUsers.length > 0 && (
          <div className="px-5 pt-4">
            <p className="text-mono-label mb-2" style={{ color: INK_2 }}>
              Unter anderem dabei
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
          <button
            onClick={onJoin}
            disabled={isFull && !isJoined}
            className="card-tap w-full py-4 font-display text-lg uppercase"
            style={
              isJoined
                ? { background: PAPER_1, color: INK, border: "var(--rule-thick)" }
                : isFull
                  ? { background: PAPER_1, color: INK_2, border: "var(--rule-thin)", cursor: "not-allowed" }
                  : { background: RUST, color: "var(--paper-0)", border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }
            }
          >
            {isJoined ? "Zusage zurückziehen" : isFull ? "Event ist voll" : "Zusagen"}
          </button>
        </div>
      </div>
    </>
  );
}

function EventCard({
  post,
  author,
  isJoined,
  index,
  onOpen,
}: {
  post: RidePost;
  author: User;
  isJoined: boolean;
  index: number;
  onOpen: () => void;
}) {
  const taken = post.takenSpots + (isJoined ? 1 : 0);
  const openSpots = post.totalSpots - taken;
  const isFull = openSpots <= 0;
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
          style={{ background: OCHRE, color: INK }}
        >
          {post.date}
        </span>
        {isJoined && (
          <span
            className="text-mono-label absolute right-0 top-0 px-2 py-1"
            style={{ background: PINE, color: "var(--paper-0)" }}
          >
            Zugesagt
          </span>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1.0625rem] font-semibold leading-snug" style={{ color: INK }}>
            {post.title ?? post.resort}
          </h3>
          <Tag level={post.abilityLevel} />
        </div>

        {/* Das Gebiet ist die oeffentliche Information schlechthin —
            es bleibt auf der Karte, ausser der Titel nennt es schon. */}
        <p className="mt-1 text-sm" style={{ color: INK_2 }}>
          {(post.title ?? "").toLowerCase().includes(post.resort.toLowerCase())
            ? `${post.meetTime} · ${author.name}`
            : `${post.resort} · ${post.meetTime} · ${author.name}`}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1" style={{ background: "var(--paper-2)", border: "1px solid var(--border-hairline)" }}>
            <div style={{ width: `${filled}%`, height: "100%", background: isFull ? INK_2 : RUST }} />
          </div>
          <span className="text-mono-label flex-shrink-0" style={{ color: isFull ? INK_2 : INK }}>
            {isFull ? "voll" : `${openSpots} frei`}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function EventsScreen() {
  const [city, setCity] = useState<City>("innsbruck");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  /* Die Filterung laeuft ueber isDiscoverablePublicRide, nicht ueber
     einen simplen visibility-Vergleich: so faellt auch eine falsch
     markierte Ausfahrt einer minderjaehrigen Person heraus. */
  const events = useMemo(
    () =>
      PUBLIC_EVENTS.filter((event) => {
        if (event.city !== city) return false;
        const author = getUserById(event.authorId);
        return author ? isDiscoverablePublicRide(event, author) : false;
      })
        /* Volle Events nach hinten. Dieser Screen ist der Einstieg
           fuer Leute ohne Kontakte — oben muss stehen, wo man noch
           mitkann, nicht wo man zu spaet ist. */
        .sort(
          (a, b) =>
            Number(a.takenSpots >= a.totalSpots) -
            Number(b.takenSpots >= b.totalSpots),
        ),
    [city],
  );

  const openEvent = events.find((event) => event.id === openEventId) ?? null;
  const openSeats = events.reduce(
    (sum, event) => sum + Math.max(0, event.totalSpots - event.takenSpots),
    0,
  );

  const toggleJoin = (id: string) =>
    setJoinedIds((previous) => toggleSetValue(previous, id));

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>
            Events
          </h1>
          <p className="mt-0.5 text-xs font-semibold" style={{ color: INK_2 }}>
            {events.length} offene Events · {openSeats} Plätze frei
          </p>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]}
            value={city}
            onChange={setCity}
            ariaLabel="Region"
          />
        </div>
      </header>

      {/* Erklaert die Sichtbarkeitsregel dort, wo sie greift.
          Fremde lesen hier mit, also gehoert die Regel auf den
          Screen und nicht in eine Hilfeseite. */}
      <div
        className="mx-4 mt-4 flex items-start gap-3 px-4 py-3"
        style={{ background: PAPER_1, border: "var(--rule-thin)" }}
      >
        <Icon name="globe" size={16} color={PINE} strokeWidth={1.7} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-mono-label" style={{ color: INK }}>Für alle offen</p>
          <p className="mt-1 text-sm leading-snug" style={{ color: INK_1 }}>
            Du brauchst hier niemanden zu kennen. Das Gebiet sieht jeder, den
            genauen Treffpunkt erst, wer zugesagt hat.
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4 pb-6 stagger">
        {events.map((event, index) => {
          const author = getUserById(event.authorId);
          if (!author) return null;
          return (
            <EventCard
              key={event.id}
              post={event}
              author={author}
              isJoined={joinedIds.has(event.id)}
              index={index}
              onOpen={() => setOpenEventId(event.id)}
            />
          );
        })}

        {events.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Icon name="calendar-days" size={30} color={INK_2} strokeWidth={1.5} />
            <div>
              <p className="font-semibold" style={{ color: INK }}>
                Hier ist gerade nichts offen
              </p>
              <p className="mt-1 text-sm" style={{ color: INK_2 }}>
                In der anderen Region laufen vielleicht welche.
              </p>
            </div>
          </div>
        )}
      </div>

      {openEvent && (() => {
        const author = getUserById(openEvent.authorId);
        if (!author) return null;
        return (
          <EventDetailSheet
            post={openEvent}
            author={author}
            joinedUsers={getUsersByIds(openEvent.joinedUserIds)}
            isJoined={joinedIds.has(openEvent.id)}
            onJoin={() => toggleJoin(openEvent.id)}
            onClose={() => setOpenEventId(null)}
          />
        );
      })()}
    </>
  );
}
