"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { findLift, LIFTS } from "@/lib/lifts";
import type { Position } from "@/features/location/location";
import Icon from "@/components/ui/Icon";
import { START_MESSAGES, type LiftMeetup, type StartResult } from "./meetup";
import { canSuggestFromPosition, suggestMeetingLift } from "./estimate";

function timeAt(iso: string, locale: Intl.LocalesArgument): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function LiftMeetupPanel({ mine, friends, me, busy, result, onStop, onLocate, canShare, onStartClick }: {
  mine: LiftMeetup | null;
  friends: LiftMeetup[] | null;
  me: Position | null;
  busy: boolean;
  result: StartResult | null;
  onStop: () => void;
  onLocate: () => void;
  canShare?: boolean;
  onStartClick?: () => void;
}) {
  const t = useT();
  const locale = INTL_LOCALE[useLocale()];
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAt(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const myLift = mine ? findLift(mine.resort, mine.liftId) : undefined;
  const activeFriends = friends?.filter((friend) => new Date(friend.expiresAt).getTime() > at.getTime()) ?? [];

  return (
    <section className="px-4 pt-4" aria-labelledby="lift-meetup-title">
      <div className="p-4" style={{ border: "var(--rule-thin)", background: "var(--paper-1)", borderRadius: 18 }}>
        <h2 id="lift-meetup-title" className="text-lg font-semibold" style={{ color: "var(--ink-0)" }}>{t("meetup.title")}</h2>
        {mine && myLift && (
          /* The rider sees the same forecast their crew gets. */
          <div className="mt-2">
            <p className="text-base font-semibold" style={{ color: "var(--ink-0)" }}>
              {t("meetup.yourForecast", { time: timeAt(mine.arrivalAt, locale), station: myLift.topStationName ?? t("meetup.topStationOf", { lift: myLift.name }) })}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="min-w-0 flex-1 text-xs" style={{ color: "var(--ink-2)" }}>
                {t("meetup.visibleUntil", { time: timeAt(mine.expiresAt, locale) })}
              </p>
              <button type="button" onClick={onStop} disabled={busy} className="min-h-11 px-3 text-sm font-semibold disabled:opacity-50"
                style={{ border: "var(--rule-thin)", background: "var(--paper-0)", color: "var(--crimson)", borderRadius: 12 }}>{t("meetup.stop")}</button>
            </div>
          </div>
        )}
        {onStartClick && canShare && (
          <button type="button" onClick={onStartClick} disabled={busy}
            className={`card-tap mt-3 flex w-full items-center justify-center gap-2 px-3 font-semibold disabled:opacity-50 ${mine ? "min-h-11 text-sm" : "min-h-14 text-base"}`}
            style={mine
              ? { border: "var(--rule-thin)", color: "var(--ink-1)", borderRadius: 14 }
              : { background: "var(--rust)", color: "var(--on-accent)", borderRadius: 16 }}>
            {!mine && <Icon name="mountain-snow" size={18} />}
            {mine ? t("meetup.changeLift") : t("meetup.quickStart")}
          </button>
        )}
        {onStartClick && !canShare && <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>{t("meetup.from16")}</p>}
        {result && result !== "sharing" && <p role="alert" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t(START_MESSAGES[result])}</p>}
        <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>{t("meetup.estimate")}</p>
      </div>

      {friends === null ? (
        <p className="mt-3 text-sm" style={{ color: "var(--crimson)" }}>{t("meetup.unavailable")}</p>
      ) : activeFriends.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>{t("meetup.noFriends")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {activeFriends.map((friend) => {
            const destination = findLift(friend.resort, friend.liftId);
            if (!destination) return null;
            const precisePosition = me && canSuggestFromPosition(me.accuracy);
            const route = precisePosition ? suggestMeetingLift(
              LIFTS.filter((lift) => lift.resort === friend.resort),
              destination.topCoordinates,
              [me.lat, me.lng],
              at,
            ) : null;
            return (
              <li key={friend.userId} className="p-3" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface-1)" }}>
                <p className="text-sm font-black" style={{ color: "var(--ink-0)" }}>
                  {t("meetup.arrival", { name: friend.name, station: destination.topStationName ?? t("meetup.topStationOf", { lift: destination.name }), time: timeAt(friend.arrivalAt, locale) })}
                </p>
                {destination.durationSource === "derived" && <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>{t("meetup.durationEstimated")}</p>}
                {route ? (
                  <>
                    <p className="mt-2 text-sm font-semibold" style={{ color: "var(--ink-0)" }}>
                      {t("meetup.yourRoute", { lift: route.lift.name, time: timeAt(route.arrivalAt.toISOString(), locale) })}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
                      {t("meetup.routeHint", { lift: route.lift.name, distance: Math.round(route.distanceToBottomMeters) })}
                    </p>
                  </>
                ) : me && !precisePosition ? (
                  <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>{t("meetup.imprecisePosition")}</p>
                ) : me ? (
                  <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>{t("meetup.noRoute")}</p>
                ) : (
                  <button type="button" onClick={onLocate} className="mt-2 flex min-h-11 items-center gap-2 text-left text-xs font-semibold" style={{ color: "var(--rust)" }}>
                    <Icon name="locate" size={16} color="var(--rust)" />{t("meetup.noPosition")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
