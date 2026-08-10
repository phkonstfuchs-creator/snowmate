"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { City, ResortStatus } from "@/lib/types";
import { RESORT_STATUS, RIDE_POSTS, getUserById } from "@/lib/data";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import ResortScene from "@/components/ResortScene";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

const SURFACE = "var(--bg-surface-1)";
const BORDER  = "var(--border-subtle)";
const MUTED   = "var(--text-tertiary)";
const INK     = "var(--text-primary)";
const BRAND   = "var(--accent-primary)";

const CONDITIONS_LABELS: Record<ResortStatus["conditions"], string> = {
  fresh: "Fresh snow", groomed: "Groomed", icy: "Icy", slushy: "Slushy",
};

type ActiveMapSheet = { type: "resort"; resort: ResortStatus } | null;

function ResortDetailSheet({ resort, onClose }: { resort: ResortStatus; onClose: () => void }) {
  useScrollLock();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const ridesHere = RIDE_POSTS.filter((p) => p.resort === resort.name && p.city === resort.city);

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-label={`Details for ${resort.name}`} tabIndex={-1} style={{ maxHeight: "88dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <button type="button" onClick={dismiss} aria-label="Close details" className="absolute right-3 top-2 z-10 flex h-11 w-11 items-center justify-center">
          <Icon name="x" size={18} color={MUTED} strokeWidth={2} />
        </button>

        {/* Vector scene hero */}
        <div className="mx-5 mt-4" style={{ border: "var(--rule-thin)" }}>
          <div className="relative overflow-hidden" style={{ height: 118 }}>
            <ResortScene name={resort.name} className="absolute inset-0 w-full h-full" />
            <span
              className="text-mono-label absolute right-0 top-0 px-2 py-1"
              style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}
            >
              {resort.snowDepth} cm
            </span>
          </div>
          <div
            className="flex items-baseline justify-between gap-3 px-3 py-2"
            style={{ background: "var(--paper-0)", borderTop: "var(--rule-thin)" }}
          >
            <span className="font-display text-base uppercase" style={{ color: INK, letterSpacing: 0 }}>
              {resort.name}
            </span>
            <span className="text-mono-label" style={{ color: MUTED }}>
              {resort.altitudeMin}–{resort.altitudeMax} m
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-4">
          {[
            { label: "riding now", val: resort.ridersNow, live: true },
            { label: "lifts open", val: `${resort.liftsOpen}/${resort.totalLifts}` },
            { label: CONDITIONS_LABELS[resort.conditions], val: "Snow", cond: resort.conditions },
          ].map(({ label, val, live, cond }) => (
            <div key={label}
              className={clsx("rounded-none p-3 text-center", cond ? `cond-${cond}` : "")}
              style={cond ? {} : { background: SURFACE, border: `1px solid ${BORDER}` }}>
              {live && <div className="flex justify-center mb-1"><span className="pulse-dot" style={{ width: 6, height: 6 }} /></div>}
              <p className="font-black text-lg" style={{ color: cond ? undefined : INK }}>{val}</p>
              <p className="text-[0.65rem] font-semibold" style={{ color: cond ? undefined : MUTED }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Ability bars */}
        <div className="px-5 mt-4">
          <p className="text-[0.65rem] font-black uppercase mb-2.5" style={{ color: MUTED }}>Who rides what</p>
          {[
            { label: "Chill",     count: resort.chillRiders,    color: "var(--rust-ink)", bg: "var(--accent-warm-subtle)" },
            { label: "Park",      count: resort.parkRiders,     color: "var(--sky-ink)",  bg: "rgba(62, 110, 142, 0.16)" },
            { label: "Off-piste", count: resort.offPisteRiders, color: "var(--pine)",     bg: "rgba(42, 86, 71, 0.16)" },
          ].map(({ label, count, color, bg }) => {
            const pct = resort.ridersNow > 0 ? Math.round((count / resort.ridersNow) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-3 mb-1.5">
                <span className="w-16 text-xs font-bold" style={{ color: MUTED }}>{label}</span>
                <div className="flex-1 overflow-hidden" style={{ height: 10, background: bg, border: "1px solid var(--border-hairline)" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color }} />
                </div>
                <span className="w-6 text-xs font-black text-right" style={{ color: INK }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Rides here */}
        {ridesHere.length > 0 && (
          <div className="px-5 mt-4">
            <p className="text-[0.65rem] font-black uppercase mb-3" style={{ color: MUTED }}>Rides here today</p>
            {ridesHere.map((ride) => {
              const a = getUserById(ride.authorId);
              if (!a) return null;
              return (
                <div key={ride.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Avatar id={a.id} initials={a.avatar} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black" style={{ color: INK }}>{a.name}</p>
                    <p className="text-xs font-semibold" style={{ color: MUTED }}>{ride.meetTime} · {ride.totalSpots - ride.takenSpots} open</p>
                  </div>
                  <span className={clsx("text-mono-label px-2 py-0.5 flex-shrink-0",
                    ride.abilityLevel === "chill" && "badge-chill",
                    ride.abilityLevel === "park" && "badge-park",
                    ride.abilityLevel === "off-piste" && "badge-offpiste")}>
                    {ride.abilityLevel === "chill" ? "Chill" : ride.abilityLevel === "park" ? "Park" : "OP"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function MapPage() {
  const [city, setCity] = useState<City>("innsbruck");
  const [activeSheet, setActiveSheet] = useState<ActiveMapSheet>(null);

  const resorts = useMemo(
    () => RESORT_STATUS.filter((resort) => resort.city === city),
    [city],
  );
  const sorted      = [...resorts].sort((a, b) => b.ridersNow - a.ridersNow);
  const hotResort   = sorted[0];
  const totalRiders = resorts.reduce((s, r) => s + r.ridersNow, 0);
  const deepestSnow = [...resorts].sort((a, b) => b.snowDepth - a.snowDepth)[0];

  return (
    <>
      <header className="sticky top-0 z-50"
        style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>Map</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>
              {totalRiders} riding now · {resorts.length} resorts
            </p>
          </div>
          <div className="text-right">
            <p className="text-mono-data" style={{ color: INK }}>
              {deepestSnow?.snowDepth ?? 0} cm
            </p>
            <p className="text-[0.65rem] font-semibold" style={{ color: MUTED }}>
              deepest snow
            </p>
          </div>
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

      {/* Real Leaflet map */}
      <div style={{ height: 280, position: "relative", overflow: "hidden" }}>
        <LeafletMap
          city={city}
          resorts={resorts}
          onSelect={(resort) => setActiveSheet({ type: "resort", resort })}
        />
      </div>

      {/* Brennpunkt strip */}
      {hotResort && (
        <button
          className="flex items-center gap-3 mx-4 mt-3 p-3 rounded-none w-[calc(100%-2rem)] overflow-hidden card-tap"
          style={{ background: BRAND }}
          onClick={() => setActiveSheet({ type: "resort", resort: hotResort })}
        >
          <div className="w-14 h-14 rounded-none overflow-hidden flex-shrink-0">
            <ResortScene name={hotResort.name} className="w-full h-full" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: "var(--text-on-accent)" }}>{hotResort.name}</p>
            <p className="text-xs font-semibold" style={{ color: "var(--paper-0)" }}>
              {hotResort.ridersNow} riding now · {hotResort.snowDepth} cm snow
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black" style={{ color: "var(--paper-0)" }}>Hotspot</span>
            <Icon name="chevron-right" size={14} color="var(--text-on-accent)" strokeWidth={2} />
          </div>
        </button>
      )}

      {/* Resort list */}
      <div className="px-4 pt-4 pb-6">
        <p className="text-[0.65rem] font-black uppercase mb-3" style={{ color: MUTED }}>All resorts</p>
        <div className="space-y-2">
          {sorted.map((resort, i) => (
            <button
              key={resort.name}
              className="card-tap w-full flex items-center gap-3 p-0 rounded-none overflow-hidden anim-fade-up text-left"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, animationDelay: `${i * 40}ms` }}
              onClick={() => setActiveSheet({ type: "resort", resort })}
            >
              <div className="w-14 h-14 overflow-hidden flex-shrink-0">
                <ResortScene name={resort.name} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm truncate" style={{ color: INK }}>{resort.name}</span>
                  {resort.conditions === "fresh" && (
                    <span className="text-mono-label px-1.5 flex-shrink-0 badge-chill">Fresh</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="pulse-dot" style={{ width: 5, height: 5 }} />
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.ridersNow} riding</span>
                  <span style={{ color: "var(--ink-3)" }}>·</span>
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.snowDepth} cm</span>
                  <span style={{ color: "var(--ink-3)" }}>·</span>
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.liftsOpen}/{resort.totalLifts} lifts</span>
                </div>
              </div>
              <div className="pr-3">
                <Icon name="chevron-right" size={14} color={MUTED} strokeWidth={1.8} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeSheet?.type === "resort" && (
        <ResortDetailSheet
          resort={activeSheet.resort}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </>
  );
}
