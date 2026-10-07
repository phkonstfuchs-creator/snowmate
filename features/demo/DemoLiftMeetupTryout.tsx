"use client";

import { useState } from "react";
import LiftMeetupPanel from "@/features/lift-meetup/LiftMeetupPanel";
import { estimateLiftArrival } from "@/features/lift-meetup/estimate";
import type { LiftMeetup } from "@/features/lift-meetup/meetup";
import { LIFTS } from "@/lib/lifts";
import { useT } from "@/lib/i18n/client";

const SAMPLE_LIFT = LIFTS.find((lift) => lift.id === "osm-way-25170582");

export default function DemoLiftMeetupTryout() {
  const t = useT();
  const [friend, setFriend] = useState<LiftMeetup | null>(null);

  if (!SAMPLE_LIFT) return null;

  const startSample = () => {
    const now = new Date();
    setFriend({
      userId: "demo-lena",
      name: "Lena",
      handle: null,
      resort: SAMPLE_LIFT.resort,
      liftId: SAMPLE_LIFT.id,
      startedAt: now.toISOString(),
      arrivalAt: estimateLiftArrival(SAMPLE_LIFT, now).toISOString(),
      expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
    });
  };

  return (
    <section className="mx-4 mt-4 p-4" aria-labelledby="demo-lift-title"
      style={{ border: "var(--rule-thick)", background: "var(--paper-1)" }}>
      <h2 id="demo-lift-title" className="font-display text-xl" style={{ color: "var(--ink-0)" }}>
        {t("demo.meetup.title")}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-1)" }}>{t("demo.meetup.lead")}</p>

      {friend ? (
        <>
          <p className="mt-3 text-xs font-semibold" style={{ color: "var(--ink-2)" }}>
            {t("demo.meetup.position")}
          </p>
          <LiftMeetupPanel
            mine={null}
            friends={[friend]}
            me={{ lat: SAMPLE_LIFT.bottomCoordinates[0], lng: SAMPLE_LIFT.bottomCoordinates[1], accuracy: 10 }}
            busy={false}
            result={null}
            onStop={() => undefined}
            onLocate={() => undefined}
          />
          <button type="button" onClick={() => setFriend(null)}
            className="mt-3 min-h-11 w-full px-3 text-sm font-semibold"
            style={{ border: "var(--rule-thin)", color: "var(--ink-0)", background: "var(--paper-0)" }}>
            {t("demo.meetup.reset")}
          </button>
        </>
      ) : (
        <button type="button" onClick={startSample}
          className="card-tap mt-4 min-h-11 w-full px-3 text-base font-semibold"
          style={{ background: "var(--rust)", color: "var(--on-accent)" }}>
          {t("demo.meetup.start")}
        </button>
      )}
    </section>
  );
}
