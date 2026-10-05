"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import Tag from "@/components/ui/Tag";
import type { LiveRide } from "@/features/rides/live-ride";

function RideRow({ ride }: { ride: LiveRide }) {
  const t = useT();
  return (
    <li>
      <Link href="/feed" className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border-hairline)" }}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: "var(--ink-0)" }}>{ride.post.title ?? ride.post.resort}</p>
          <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
            {ride.post.date} · {ride.post.meetTime} · {ride.isHost ? t("profile.hosting") : t("profile.joinedRide")}
          </p>
        </div>
        <Tag level={ride.post.abilityLevel} showIcon={false} />
      </Link>
    </li>
  );
}

/* The viewer's rides: what is coming up, then the last few they rode. */
export default function MyRides({ upcoming, past }: { upcoming: LiveRide[]; past: LiveRide[] }) {
  const t = useT();
  if (upcoming.length === 0 && past.length === 0) return null;
  return (
    <section className="px-4 pt-5" aria-label={t("profile.myRides")}>
      <h2 className="text-mono-label mb-2" style={{ color: "var(--ink-2)" }}>{t("profile.myRides")}</h2>
      <div className="overflow-hidden" style={{ background: "var(--paper-1)", border: "var(--rule-thin)" }}>
        {upcoming.length > 0 && (
          <>
            <p className="px-4 pt-3 text-xs font-semibold" style={{ color: "var(--ink-1)" }}>{t("profile.upcoming")}</p>
            <ul>{upcoming.map((ride) => <RideRow key={ride.post.id} ride={ride} />)}</ul>
          </>
        )}
        {past.length > 0 && (
          <>
            <p className="px-4 pt-3 text-xs font-semibold" style={{ color: "var(--ink-1)" }}>{t("profile.past")}</p>
            <ul>{past.map((ride) => <RideRow key={ride.post.id} ride={ride} />)}</ul>
          </>
        )}
      </div>
    </section>
  );
}
