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
  fresh: "Neuschnee", groomed: "Präpariert", icy: "Eisig", slushy: "Sulzig",
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
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-label={`Details zu ${resort.name}`} tabIndex={-1} style={{ maxHeight: "88dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <button type="button" onClick={dismiss} aria-label="Details schließen" className="absolute right-3 top-2 z-10 flex h-11 w-11 items-center justify-center">
          <Icon name="x" size={18} color={MUTED} strokeWidth={2} />
        </button>

        {/* Vector scene hero */}
        <div className="mx-5 mt-4 rounded-none overflow-hidden relative" style={{ height: 140 }}>
          <ResortScene name={resort.name} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65) 100%)" }} />
          <div className="absolute bottom-3 left-4">
            <p className="font-black text-white text-lg drop-shadow">{resort.name}</p>
            <p className="text-white/70 text-xs font-semibold">{resort.altitudeMin}–{resort.altitudeMax} m</p>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-xs font-black text-white">{resort.snowDepth} cm Schnee</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-4">
          {[
            { label: "jetzt unterwegs", val: resort.ridersNow, live: true },
            { label: "Lifte offen", val: `${resort.liftsOpen}/${resort.totalLifts}` },
            { label: CONDITIONS_LABELS[resort.conditions], val: "Schnee", cond: resort.conditions },
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
          <p className="text-[0.65rem] font-black uppercase mb-2.5" style={{ color: MUTED }}>Wer fährt was</p>
          {[
            { label: "Chill",     count: resort.chillRiders,    color: "var(--sky)",   bg: "var(--accent-primary-subtle)" },
            { label: "Park",      count: resort.parkRiders,     color: "var(--rust)", bg: "var(--accent-warm-subtle)" },
            { label: "Off-Piste", count: resort.offPisteRiders, color: "#FF9C9C",          bg: "rgba(255,107,107,0.14)" },
          ].map(({ label, count, color, bg }) => {
            const pct = resort.ridersNow > 0 ? Math.round((count / resort.ridersNow) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-3 mb-1.5">
                <span className="w-16 text-xs font-bold" style={{ color: MUTED }}>{label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: bg }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="w-6 text-xs font-black text-right" style={{ color: INK }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Rides here */}
        {ridesHere.length > 0 && (
          <div className="px-5 mt-4">
            <p className="text-[0.65rem] font-black uppercase mb-3" style={{ color: MUTED }}>Ausfahrten heute hier</p>
            {ridesHere.map((ride) => {
              const a = getUserById(ride.authorId);
              if (!a) return null;
              return (
                <div key={ride.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Avatar id={a.id} initials={a.avatar} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black" style={{ color: INK }}>{a.name}</p>
                    <p className="text-xs font-semibold" style={{ color: MUTED }}>{ride.meetTime} · {ride.totalSpots - ride.takenSpots} frei</p>
                  </div>
                  <span className={clsx("text-[0.65rem] font-black px-2 py-0.5 rounded-full flex-shrink-0",
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
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>Karte</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>
              {totalRiders} fahren gerade · {resorts.length} Gebiete
            </p>
          </div>
          <div className="text-right">
            <p className="text-mono-data" style={{ color: INK }}>
              {deepestSnow?.snowDepth ?? 0} cm
            </p>
            <p className="text-[0.65rem] font-semibold" style={{ color: MUTED }}>
              tiefster Schnee
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
          className="flex items-center gap-3 mx-4 mt-3 p-3 rounded-none w-[calc(100%-2rem)] active:scale-[0.98] transition-transform overflow-hidden"
          style={{ background: BRAND }}
          onClick={() => setActiveSheet({ type: "resort", resort: hotResort })}
        >
          <div className="w-14 h-14 rounded-none overflow-hidden flex-shrink-0">
            <ResortScene name={hotResort.name} className="w-full h-full" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: "var(--text-on-accent)" }}>{hotResort.name}</p>
            <p className="text-xs font-semibold" style={{ color: "var(--paper-0)" }}>
              {hotResort.ridersNow} fahren gerade · {hotResort.snowDepth} cm Schnee
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black" style={{ color: "var(--paper-0)" }}>Brennpunkt</span>
            <Icon name="chevron-right" size={14} color="var(--text-on-accent)" strokeWidth={2} />
          </div>
        </button>
      )}

      {/* Resort list */}
      <div className="px-4 pt-4 pb-6">
        <p className="text-[0.65rem] font-black uppercase mb-3" style={{ color: MUTED }}>Alle Gebiete</p>
        <div className="space-y-2 stagger">
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
                    <span className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 badge-chill">Frisch</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="pulse-dot" style={{ width: 5, height: 5 }} />
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.ridersNow} fahren</span>
                  <span style={{ color: "var(--ink-3)" }}>·</span>
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.snowDepth} cm</span>
                  <span style={{ color: "var(--ink-3)" }}>·</span>
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.liftsOpen}/{resort.totalLifts} Lifte</span>
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
