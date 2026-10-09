"use client";

import { useRef } from "react";
import Link from "next/link";
import Sheet from "@/components/ui/Sheet";
import { useT } from "@/lib/i18n/client";
import type { LiveRide } from "@/features/rides/live-ride";

export default function GoStartSheet({ rides, unavailable, demo, basePath, onSelect, onCreate, onPlan, onRetry, onClose }: {
  rides: readonly LiveRide[];
  unavailable: boolean;
  demo: boolean;
  basePath: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onPlan?: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const next = useRef<(() => void) | null>(null);
  return (
    <Sheet title={t("go.title")} onClose={() => { onClose(); next.current?.(); }}>
      {(close) => (
        <>
          {onPlan && <div className="space-y-2">
            <button type="button" className="card-tap min-h-12 w-full rounded-2xl px-4 py-3 text-left font-bold" style={{ background: "var(--pine)", color: "var(--on-accent)" }} onClick={() => { next.current = onPlan; close(); }}>{t("dayPlan.create")}</button>
            <p className="text-sm" style={{ color: "var(--ink-1)" }}>{t("dayPlan.private")}</p>
          </div>}
          <p className="text-sm" style={{ color: "var(--ink-1)" }}>{t("coord.goExplain")}</p>
          {demo ? <p role="note" className="text-sm">{t("coord.goDemo")}</p> : unavailable ? (
            <div className="space-y-2">
              <p role="alert" className="text-sm">{t("go.unavailable")}</p>
              <button type="button" className="min-h-11 font-semibold underline" onClick={onRetry}>{t("go.retry")}</button>
            </div>
          ) : rides.length > 0 ? (
            <ul className="space-y-2">
              {rides.map((ride) => (
                <li key={ride.post.id}>
                  <button type="button" className="card-tap w-full min-h-16 rounded-xl border px-4 py-3 text-left" style={{ background: "var(--paper-1)", borderColor: "var(--border-subtle)" }} onClick={() => {
                    next.current = () => onSelect(ride.post.id);
                    close();
                  }}>
                    <span className="block font-semibold">{ride.post.resort}</span>
                    <span className="block text-sm" style={{ color: "var(--ink-2)" }}>{ride.post.date} · {ride.post.meetTime} · {ride.host.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm">{t("coord.goEmpty")}</p>}
          <div className="space-y-2 border-t pt-3" style={{ borderColor: "var(--border-subtle)" }}>
            <button type="button" className="block min-h-11 font-semibold underline" onClick={() => { next.current = onCreate; close(); }}>{t("feed.postRide")}</button>
            <Link href={`${basePath}/people`} className="flex min-h-11 items-center font-semibold underline">{t("coord.findCrew")}</Link>
            <Link href={`${basePath}/events`} className="flex min-h-11 items-center font-semibold underline">{t("feed.browseEvents")}</Link>
          </div>
        </>
      )}
    </Sheet>
  );
}
