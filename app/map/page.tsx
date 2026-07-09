"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { City, ResortStatus } from "@/lib/types";
import { RESORT_STATUS, RIDE_POSTS, getUserById, ME } from "@/lib/data";
import { useScrollLock } from "@/lib/useScrollLock";
import ResortScene from "@/components/ResortScene";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

const D       = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER  = "var(--border-subtle)";
const MUTED   = "var(--text-tertiary)";
const INK     = "var(--text-primary)";
const BRAND   = "var(--accent-primary)";

const CONDITIONS_LABELS: Record<string, string> = {
  fresh: "Fresh", groomed: "Groomed", icy: "Icy", slushy: "Slushy",
};

function ResortDetailSheet({ resort, onClose }: { resort: ResortStatus; onClose: () => void }) {
  useScrollLock();
  const ridesHere = RIDE_POSTS.filter((p) => p.resort === resort.name && p.city === resort.city);

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel" style={{ maxHeight: "88dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>

        {/* Vector scene hero */}
        <div className="mx-5 mt-4 rounded-2xl overflow-hidden relative" style={{ height: 140 }}>
          <ResortScene name={resort.name} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65) 100%)" }} />
          <div className="absolute bottom-3 left-4">
            <p className="font-black text-white text-lg tracking-tight drop-shadow">{resort.name}</p>
            <p className="text-white/70 text-xs font-semibold">{resort.altitudeMin}–{resort.altitudeMax} m</p>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-xs font-black text-white">{resort.snowDepth} cm snow</span>
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
              className={clsx("rounded-2xl p-3 text-center", cond ? `cond-${cond}` : "")}
              style={cond ? {} : { background: SURFACE, border: `1px solid ${BORDER}` }}>
              {live && <div className="flex justify-center mb-1"><span className="pulse-dot" style={{ width: 6, height: 6 }} /></div>}
              <p className="font-black text-lg" style={{ color: cond ? undefined : INK }}>{val}</p>
              <p className="text-[0.65rem] font-semibold" style={{ color: cond ? undefined : MUTED }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Ability bars */}
        <div className="px-5 mt-4">
          <p className="text-[0.65rem] font-black uppercase tracking-widest mb-2.5" style={{ color: MUTED }}>Who's riding what</p>
          {[
            { label: "Chill",     count: resort.chillRiders,    color: "var(--ice-400)",   bg: "var(--accent-primary-subtle)" },
            { label: "Park",      count: resort.parkRiders,     color: "var(--ember-400)", bg: "var(--accent-warm-subtle)" },
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
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-3" style={{ color: MUTED }}>Rides here today</p>
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

function SatelliteUpsell({ onClose }: { onClose: () => void }) {
  useScrollLock();
  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-panel" style={{ paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex justify-center pt-3 mb-5">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--accent-warm)" }}>
            <Icon name="star" size={28} color="white" fill="white" strokeWidth={0} />
          </div>
        </div>
        <div className="px-5 text-center mb-5">
          <h2 className="font-display" style={{ color: INK, fontSize: 22, fontWeight: 800 }}>Unlock Premium</h2>
          <p className="text-sm font-medium leading-relaxed mt-1" style={{ color: MUTED }}>
            Satellite map, powder alerts and advanced stats.
          </p>
        </div>
        <div className="px-5 space-y-2 mb-5">
          {[
            "Satellite map · terrain & couloirs live",
            "Powder alerts · 15+ cm push notification",
            "Advanced stats · heatmap + vertical",
          ].map((t) => {
            const [label, desc] = t.split(" · ");
            return (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BRAND }}>
                  <Icon name="check" size={12} color={D} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: INK }}>{label}</p>
                  <p className="text-xs font-medium" style={{ color: MUTED }}>{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 space-y-2">
          <button className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-transform"
            style={{ background: "var(--accent-warm)", color: "var(--text-on-accent)" }}>
            Start for € 2.99 / month
          </button>
          <button onClick={onClose} className="w-full py-3 text-sm font-bold" style={{ color: MUTED }}>
            Not now
          </button>
        </div>
      </div>
    </>
  );
}

export default function MapPage() {
  const [city, setCity] = useState<City>("innsbruck");
  const [showUpsell, setShowUpsell] = useState(false);
  const [selectedResort, setSelectedResort] = useState<ResortStatus | null>(null);

  const resorts     = RESORT_STATUS.filter((r) => r.city === city);
  const sorted      = [...resorts].sort((a, b) => b.ridersNow - a.ridersNow);
  const hotResort   = sorted[0];
  const totalRiders = resorts.reduce((s, r) => s + r.ridersNow, 0);

  return (
    <>
      <header className="sticky top-0 z-50"
        style={{ background: "rgba(10,14,18,0.96)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>Map</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>
              {totalRiders} riders live · {resorts.length} resorts
            </p>
          </div>
          <button
            onClick={() => (ME.isPremium ? undefined : setShowUpsell(true))}
            className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-full active:scale-95 transition-all"
            style={{ background: SURFACE, color: MUTED, border: `1px solid ${BORDER}` }}
          >
            <Icon name="satellite" size={13} strokeWidth={1.5} />
            Satellite
            <span className="text-[0.55rem] font-black px-1 py-0.5 rounded-full"
              style={{ background: "var(--accent-warm)", color: "var(--text-on-accent)" }}>PRO</span>
          </button>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]}
            value={city}
            onChange={setCity}
          />
        </div>
      </header>

      {/* Real Leaflet map */}
      <div style={{ height: 280, position: "relative", overflow: "hidden" }}>
        <LeafletMap city={city} resorts={resorts} onSelect={setSelectedResort} />
      </div>

      {/* Hotspot strip */}
      {hotResort && (
        <button
          className="flex items-center gap-3 mx-4 mt-3 p-3 rounded-2xl w-[calc(100%-2rem)] active:scale-[0.98] transition-transform overflow-hidden"
          style={{ background: BRAND }}
          onClick={() => setSelectedResort(hotResort)}
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
            <ResortScene name={hotResort.name} className="w-full h-full" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm" style={{ color: "var(--text-on-accent)" }}>{hotResort.name}</p>
            <p className="text-xs font-semibold" style={{ color: "rgba(4,20,28,0.72)" }}>
              {hotResort.ridersNow} riders live · {hotResort.snowDepth} cm snow
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black" style={{ color: "rgba(4,20,28,0.65)" }}>Hotspot</span>
            <Icon name="chevron-right" size={14} color="var(--text-on-accent)" strokeWidth={2} />
          </div>
        </button>
      )}

      {/* Resort list */}
      <div className="px-4 pt-4 pb-6">
        <p className="text-[0.65rem] font-black uppercase tracking-widest mb-3" style={{ color: MUTED }}>All resorts</p>
        <div className="space-y-2 stagger">
          {sorted.map((resort, i) => (
            <button
              key={resort.name}
              className="card-tap w-full flex items-center gap-3 p-0 rounded-2xl overflow-hidden anim-fade-up text-left"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, animationDelay: `${i * 40}ms` }}
              onClick={() => setSelectedResort(resort)}
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
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.ridersNow} riders</span>
                  <span style={{ color: BORDER }}>·</span>
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.snowDepth} cm</span>
                  <span style={{ color: BORDER }}>·</span>
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

      {selectedResort && <ResortDetailSheet resort={selectedResort} onClose={() => setSelectedResort(null)} />}
      {showUpsell && <SatelliteUpsell onClose={() => setShowUpsell(false)} />}
    </>
  );
}
