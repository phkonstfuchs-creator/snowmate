"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { useSkiDayTracker, type SkiDayTracker } from "./useSkiDayTracker";
import { formatDuration, formatKm } from "./ski-day";
import SkiDaySummarySheet from "./SkiDaySummarySheet";

const TrackingContext = createContext<SkiDayTracker | null>(null);

/* The tracker lives in the app layout, so a running day survives
   switching tabs (ADR 0026). */
export default function TrackingProvider({ children }: { children: ReactNode }) {
  const tracker = useSkiDayTracker();
  return (
    <TrackingContext.Provider value={tracker}>
      {children}
      <TrackingBar tracker={tracker} />
      {tracker.finished && <SkiDaySummarySheet day={tracker.finished} onClose={tracker.clearFinished} />}
    </TrackingContext.Provider>
  );
}

export function useTracking(): SkiDayTracker | null {
  return useContext(TrackingContext);
}

/* While a day runs and the map is not open: one quiet line above the
   tab bar that leads back to it. */
function TrackingBar({ tracker }: { tracker: SkiDayTracker }) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const { state, now } = tracker;
  if (!state || pathname.startsWith("/map")) return null;
  return (
    <Link
      href="/map"
      className="tracking-bar fixed left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 px-4 text-sm font-semibold"
      style={{ bottom: "calc(74px + env(safe-area-inset-bottom, 0px))", whiteSpace: "nowrap", minHeight: 40, background: "var(--ink-0)", color: "var(--paper-0)", borderRadius: 999 }}
    >
      <span className="pulse-dot" style={{ width: 7, height: 7 }} aria-hidden />
      {t("track.running")} · {formatDuration(now - state.startedAt)} · {formatKm(state.distanceM, INTL_LOCALE[locale])} km
    </Link>
  );
}
