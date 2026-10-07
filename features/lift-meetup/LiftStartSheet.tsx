"use client";

import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { LIFTS, type Lift } from "@/lib/lifts";
import type { Position } from "@/features/location/location";
import { detectLift } from "./detect";
import { estimateLiftArrival } from "./estimate";
import { START_MESSAGES, type StartResult } from "./meetup";

function station(t: ReturnType<typeof useT>, lift: Lift): string {
  return lift.topStationName ?? t("meetup.topStationOf", { lift: lift.name });
}

/* "Ich fahr jetzt Lift": the app guesses the lift from the rider's own
   position (it stays on the phone) and shows when they will be at the
   top before anything is shared. Picking by hand stays one tap away. */
export default function LiftStartSheet({ resortNames, me, busy, result, onLocate, onStart, onClose }: {
  /* resorts offered for picking by hand, e.g. the current region's */
  resortNames: string[];
  me: Position | null;
  busy: boolean;
  result: StartResult | null;
  onLocate: () => void;
  onStart: (resort: string, liftId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const t = useT();
  const locale = INTL_LOCALE[useLocale()];
  /* Always ask for a fresh fix on open, and only trust positions that
     arrive after it: an old one would pick yesterday's lift. */
  const [openedWith] = useState(me);
  const fresh = me !== openedWith ? me : null;
  useEffect(() => {
    onLocate();
    // Only once on open: the position then arrives through `me`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* The preview follows the clock while the sheet is open; the server
     sets the shared time at the moment of the tap. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const detected = useMemo(() => detectLift(fresh, LIFTS), [fresh]);
  const pickable = resortNames.filter((name) => LIFTS.some((lift) => lift.resort === name));
  const [manual, setManual] = useState(false);
  const [resort, setResort] = useState(pickable[0] ?? "");
  const [liftId, setLiftId] = useState(LIFTS.find((lift) => lift.resort === (pickable[0] ?? ""))?.id ?? "");

  /* Only a lift the rider can see: the guess, or the lists once shown. */
  const listsShown = manual || (fresh !== null && !detected);
  const chosen: Lift | undefined = detected && !manual
    ? detected.lift
    : listsShown ? LIFTS.find((lift) => lift.resort === resort && lift.id === liftId) : undefined;
  const arrival = chosen ? estimateLiftArrival(chosen, new Date(now)) : null;
  const time = arrival ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(arrival) : "";

  return (
    <Sheet title={t("meetup.quickStartTitle")} onClose={onClose}>
      {(close) => (
        <>
          {detected && !manual ? (
            <div className="p-4" style={{ background: "var(--paper-1)", border: "var(--rule-thin)", borderRadius: 16 }}>
              <p className="text-mono-label" style={{ color: "var(--ink-2)" }}>{t("meetup.detectedHere")}</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: "var(--ink-0)" }}>{detected.lift.name}</p>
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>{detected.lift.resort}</p>
            </div>
          ) : (
            <>
              {!fresh && !manual && <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("meetup.finding")}</p>}
              {fresh && !detected && !manual && <p className="text-sm" style={{ color: "var(--ink-2)" }}>{t("meetup.notDetected")}</p>}
              {listsShown && pickable.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="lift-start-resort" className="text-mono-label" style={{ color: "var(--ink-2)" }}>{t("meetup.pickResort")}</label>
                    <select id="lift-start-resort" value={resort} className="form-input mt-1" onChange={(event) => {
                      setResort(event.target.value);
                      setLiftId(LIFTS.find((lift) => lift.resort === event.target.value)?.id ?? "");
                    }}>
                      {pickable.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lift-start-lift" className="text-mono-label" style={{ color: "var(--ink-2)" }}>{t("meetup.pickLift")}</label>
                    <select id="lift-start-lift" value={liftId} className="form-input mt-1" onChange={(event) => setLiftId(event.target.value)}>
                      {LIFTS.filter((lift) => lift.resort === resort).map((lift) => <option key={lift.id} value={lift.id}>{lift.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {pickable.length === 0 && listsShown && <p className="text-sm">{t("meetup.noLifts")}</p>}
            </>
          )}

          {chosen && arrival && (
            <p className="text-base font-semibold" style={{ color: "var(--ink-0)" }}>
              {t("meetup.yourForecast", { time, station: station(t, chosen) })}
            </p>
          )}

          <button type="button" disabled={busy || !chosen}
            onClick={() => chosen && void onStart(chosen.resort, chosen.id).then((ok) => { if (ok) close(); })}
            className="card-tap flex min-h-14 w-full items-center justify-center text-base font-semibold disabled:opacity-50"
            style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 16 }}>
            {busy ? t("common.oneMoment") : t("meetup.start")}
          </button>
          {detected && !manual && (
            <button type="button" onClick={() => setManual(true)} className="flex min-h-11 w-full items-center justify-center text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
              {t("meetup.otherLift")}
            </button>
          )}
          {!fresh && !manual && (
            <button type="button" onClick={() => setManual(true)} className="flex min-h-11 w-full items-center justify-center text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
              {t("meetup.pickByHand")}
            </button>
          )}
          {result && result !== "sharing" && <p role="alert" className="text-sm" style={{ color: "var(--crimson)" }}>{t(START_MESSAGES[result])}</p>}
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>{t("meetup.privacyShort")}</p>
        </>
      )}
    </Sheet>
  );
}
