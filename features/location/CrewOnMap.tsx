"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { useT } from "@/lib/i18n/client";
import type { Translate } from "@/lib/i18n/translate";
import { initialsFor } from "@/features/profile/profile-input";
import type { FriendLocation } from "./location";
import { friendWhereabouts, type FriendWhereabouts } from "./whereabouts";

function describe(t: Translate, item: FriendWhereabouts): string {
  const { where } = item;
  switch (where.kind) {
    case "lift": return t("crewmap.onLift", { lift: where.lift.name, n: where.minutesToTop });
    case "bottom": return t("crewmap.atBottom", { lift: where.lift.name });
    case "top": return t("crewmap.atTop", { place: where.lift.topStationName ?? where.lift.name });
    case "resort": return t("crewmap.inResort", { resort: where.resort });
    default: return t("crewmap.away");
  }
}

/* "Where is my crew?" first: who shares their position right now, where
   they probably are, and when they are at the top. Tap flies the map
   there. Positions are the ones friends already share (ADR 0015). */
export default function CrewOnMap({ friends, onFocus, canStartLift = false, compact = false, selectedId = null, now }: {
  friends: FriendLocation[] | null;
  onFocus: (lat: number, lng: number, userId?: string) => void;
  /* Only then can the hint point to the lift button. */
  canStartLift?: boolean;
  compact?: boolean;
  selectedId?: string | null;
  now?: number;
}) {
  const t = useT();
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (now !== undefined) return;
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [now]);

  if (friends === null) return null;
  const items = friends.map((friend) => friendWhereabouts(friend, now ?? clock)).sort((a, b) => a.ageMinutes - b.ageMinutes);

  return (
    <section aria-labelledby="crew-on-map" className={compact ? "px-4 pt-2" : "px-4 pt-4"}>
      <h2 id="crew-on-map" className="text-mono-label" style={{ color: "var(--ink-2)" }}>{t("crewmap.title")}</h2>
      {items.length === 0 ? (
        /* Point to the existing lift action without duplicating it. */
        <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>{t(canStartLift ? "next.map" : "crewmap.none")}</p>
      ) : (
        <ul className="-mx-4 mt-2 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {items.map((item) => (
            <li key={item.friend.userId} className="snap-start">
              <button
                type="button"
                onClick={() => onFocus(item.friend.lat, item.friend.lng, item.friend.userId)}
                aria-pressed={compact ? selectedId === item.friend.userId : undefined}
                className={`card-tap flex items-center gap-3 px-3 py-2 text-left ${compact ? "min-h-11 w-48" : "min-h-14 w-60"}`}
                style={{ background: "var(--paper-1)", border: selectedId === item.friend.userId ? "1px solid var(--pine)" : "var(--rule-thin)", borderRadius: 16, opacity: item.stale ? 0.6 : 1 }}
              >
                <Avatar id={item.friend.userId} initials={initialsFor(item.friend.name, item.friend.handle)} size={compact ? 32 : 40} live={!item.stale} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold" style={{ color: "var(--ink-0)" }}>{item.friend.name}</span>
                  <span className="block truncate text-xs" style={{ color: "var(--ink-1)" }}>{describe(t, item)}</span>
                  <span className="block text-xs" style={{ color: "var(--ink-2)" }}>
                    {item.ageMinutes < 1 ? t("crewmap.justNow") : t("crewmap.ago", { n: Math.round(item.ageMinutes) })}
                    {(item.where.kind === "lift" || item.where.kind === "top" || item.where.kind === "bottom") ? ` · ${t("crewmap.estimate")}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
