"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { City, ResortStatus } from "@/lib/types";
import { RESORT_STATUS, RIDE_POSTS } from "@/lib/data";
import type { LiveRide } from "@/features/rides/live-ride";
import { fixtureToLiveRide } from "@/features/rides/useRideBoard";
import { applyRideActivity, ridesAt } from "./resort-activity";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { openSpots as spotsOpen, totalOpenSpots } from "@/features/rides/capacity";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import ResortScene from "@/components/ResortScene";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";
import type { MapPerson } from "@/components/map/SkiMap";
import { useLiveLocation } from "@/features/location/useLiveLocation";
import LocationPanel from "@/features/location/LocationPanel";
import type { FriendLocation } from "@/features/location/location";
import { initialsFor } from "@/features/profile/profile-input";

const SkiMap = dynamic(() => import("@/components/map/SkiMap"), {
  ssr: false,
  loading: () => <div className="ski-map-placeholder" aria-hidden="true" />,
});

const SURFACE = "var(--bg-surface-1)";
const BORDER  = "var(--border-subtle)";
const MUTED   = "var(--text-tertiary)";
const INK     = "var(--text-primary)";
const BRAND   = "var(--accent-primary)";

const CONDITIONS_LABELS: Record<ResortStatus["conditions"], MessageKey> = {
  fresh: "map.fresh", groomed: "map.groomed", icy: "map.icy", slushy: "map.slushy",
};

type ActiveMapSheet = { type: "resort"; resort: ResortStatus } | null;

function ResortDetailSheet({
  resort,
  ridesHere,
  isLive,
  onClose,
}: {
  resort: ResortStatus;
  ridesHere: LiveRide[];
  isLive: boolean;
  onClose: () => void;
}) {
  useScrollLock();
  const t = useT();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const openSpots = totalOpenSpots(ridesHere.map((ride) => ride.post));
  /* Snow, lifts and conditions have no data source yet. The prototype
     shows sample values; the app shows what it actually knows. */
  const stats: { label: string; val: string | number; live?: boolean; cond?: ResortStatus["conditions"] }[] = isLive
    ? [
        { label: t("map.ridingToday"), val: resort.ridersNow, live: true },
        { label: t("map.rides"), val: ridesHere.length },
        { label: t("map.spotsOpen"), val: openSpots },
      ]
    : [
        { label: t("map.ridingNow"), val: resort.ridersNow, live: true },
        { label: t("map.liftsOpen"), val: `${resort.liftsOpen}/${resort.totalLifts}` },
        { label: t(CONDITIONS_LABELS[resort.conditions]), val: t("map.snow"), cond: resort.conditions },
      ];

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-label={t("map.detailsFor", { name: resort.name })} tabIndex={-1} style={{ maxHeight: "88dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <button type="button" onClick={dismiss} aria-label={t("map.closeDetails")} className="absolute right-3 top-2 z-10 flex h-11 w-11 items-center justify-center">
          <Icon name="x" size={18} color={MUTED} strokeWidth={2} />
        </button>

        {/* Vector scene hero */}
        <div className="mx-5 mt-4" style={{ border: "var(--rule-thin)" }}>
          <div className="relative overflow-hidden" style={{ height: 118 }}>
            <ResortScene name={resort.name} className="absolute inset-0 w-full h-full" />
            {!isLive && (
              <span
                className="text-mono-label absolute right-0 top-0 px-2 py-1"
                style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}
              >
                {resort.snowDepth} cm
              </span>
            )}
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
          {stats.map(({ label, val, live, cond }) => (
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
          <p className="text-[0.65rem] font-black uppercase mb-2.5" style={{ color: MUTED }}>{t("map.whoRidesWhat")}</p>
          {[
            { label: t("common.chill"), count: resort.chillRiders,    color: "var(--rust-ink)", bg: "var(--accent-warm-subtle)" },
            { label: t("common.park"), count: resort.parkRiders,     color: "var(--sky-ink)",  bg: "rgba(62, 110, 142, 0.16)" },
            { label: t("common.offPiste"), count: resort.offPisteRiders, color: "var(--pine)",     bg: "rgba(42, 86, 71, 0.16)" },
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
            <p className="text-[0.65rem] font-black uppercase mb-3" style={{ color: MUTED }}>{t("map.ridesHereToday")}</p>
            {ridesHere.map(({ post: ride, host: a }) => {
              return (
                <div key={ride.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Avatar id={a.id} initials={a.avatar} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black" style={{ color: INK }}>{a.name}</p>
                    <p className="text-xs font-semibold" style={{ color: MUTED }}>{t("map.rideLine", { time: ride.meetTime, n: spotsOpen(ride) })}</p>
                  </div>
                  <span className={clsx("text-mono-label px-2 py-0.5 flex-shrink-0",
                    ride.abilityLevel === "chill" && "badge-chill",
                    ride.abilityLevel === "park" && "badge-park",
                    ride.abilityLevel === "off-piste" && "badge-offpiste")}>
                    {ride.abilityLevel === "chill" ? t("common.chill") : ride.abilityLevel === "park" ? t("common.park") : "OP"}
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

export interface LiveMap {
  /* null when the backend could not be reached */
  rides: LiveRide[] | null;
  defaultCity: City;
  /* When my location sharing ends; null when off. */
  sharingEnd?: string | null;
  /* Friends sharing right now; null when unreachable. */
  friends?: FriendLocation[] | null;
  /* false under 16: sharing is not offered (ADR 0019). */
  canShare?: boolean;
}

type LocationState = ReturnType<typeof useLiveLocation>;

const FIXTURE_RIDES = RIDE_POSTS.map((post) => fixtureToLiveRide(post, false)).filter(
  (ride): ride is LiveRide => ride !== null,
);

/* `live` is undefined in the /demo prototype, which runs on fixtures. */
export default function MapScreen({ live }: { live?: LiveMap }) {
  return live ? <LiveMapScreen live={live} /> : <MapBody />;
}

function LiveMapScreen({ live }: { live: LiveMap }) {
  const location = useLiveLocation({
    initialSharingEnd: live.sharingEnd ?? null,
    initialFriends: live.friends ?? [],
  });
  return <MapBody live={live} location={location} />;
}

function MapBody({ live, location }: { live?: LiveMap; location?: LocationState }) {
  const t = useT();
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(null);
  const people = useMemo<MapPerson[]>(
    () =>
      (location?.friends ?? []).map((friend) => ({
        id: friend.userId,
        label: friend.name,
        initials: initialsFor(friend.name, friend.handle),
        lat: friend.lat,
        lng: friend.lng,
      })),
    [location?.friends],
  );
  const focusOn = (lat: number, lng: number) => setFocus({ lat, lng, zoom: 14, key: Date.now() });
  const locateMe = () => {
    if (!location) return;
    if (location.me) focusOn(location.me.lat, location.me.lng);
    location.locate();
  };
  /* Set on "show my location"; the map flies to the first fix after it. */
  const [locateRequest, setLocateRequest] = useState(0);
  const [city, setCity] = useState<City>(live?.defaultCity ?? "innsbruck");
  const [activeSheet, setActiveSheet] = useState<ActiveMapSheet>(null);
  const isLive = live !== undefined;
  const rides = live ? live.rides ?? [] : FIXTURE_RIDES;

  const resorts = useMemo(() => {
    const inCity = RESORT_STATUS.filter((resort) => resort.city === city);
    return live ? applyRideActivity(inCity, live.rides ?? []) : inCity;
  }, [city, live]);
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
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>{t("map.title")}</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>
              {t("map.summary", { n: totalRiders, riding: isLive ? t("map.ridingToday") : t("map.ridingNow"), resorts: resorts.length })}
            </p>
          </div>
          {!isLive && (
            <div className="text-right">
              <p className="text-mono-data" style={{ color: INK }}>
                {deepestSnow?.snowDepth ?? 0} cm
              </p>
              <p className="text-[0.65rem] font-semibold" style={{ color: MUTED }}>
                {t("map.deepestSnow")}
              </p>
            </div>
          )}
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]}
            value={city}
            onChange={setCity}
            ariaLabel={t("common.region")}
          />
        </div>
      </header>

      {/* Vector map (MapLibre) */}
      <div style={{ height: location ? "52dvh" : 280, minHeight: 280, position: "relative", overflow: "hidden" }}>
        <SkiMap
          city={city}
          resorts={resorts}
          onSelect={(resort) => setActiveSheet({ type: "resort", resort })}
          me={location?.me ?? null}
          people={people}
          onPersonSelect={(id) => {
            const friend = location?.friends?.find((item) => item.userId === id);
            if (friend) focusOn(friend.lat, friend.lng);
          }}
          focus={focus}
          locateRequest={locateRequest}
        />
        {location && (
          <button
            type="button"
            onClick={() => {
              setLocateRequest(Date.now());
              locateMe();
            }}
            aria-label={t("loc.locateMe")}
            className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center"
            style={{ zIndex: 500, background: "var(--paper-0)", border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }}
          >
            <Icon name="locate" size={20} color={location.me ? "#2f6fb2" : INK} strokeWidth={2.2} />
          </button>
        )}
        {location?.locating && (
          <p role="status" className="absolute bottom-3 left-3 px-2 py-1 text-xs font-semibold"
            style={{ zIndex: 500, background: "var(--paper-0)", border: "var(--rule-thin)", color: INK }}>
            {t("loc.locating")}
          </p>
        )}
      </div>

      {location && (
        <LocationPanel
          sharingEnd={location.sharingEnd}
          canShare={live?.canShare !== false}
          busy={location.busy}
          error={location.error ? t(location.error) : null}
          friends={location.friends}
          onShare={location.startSharing}
          onStop={() => void location.stopSharing()}
          onFocusFriend={(friend) => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            focusOn(friend.lat, friend.lng);
          }}
        />
      )}

      {live && live.rides === null && (
        <p role="status" className="mx-4 mt-3 px-3 py-2.5 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>
          {t("map.unavailable")}
        </p>
      )}

      {/* Hotspot strip: only when someone is actually out */}
      {hotResort && hotResort.ridersNow > 0 && (
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
              {isLive ? t("map.hotToday", { n: hotResort.ridersNow }) : t("map.hotNow", { n: hotResort.ridersNow, cm: hotResort.snowDepth })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black" style={{ color: "var(--paper-0)" }}>{t("map.hotspot")}</span>
            <Icon name="chevron-right" size={14} color="var(--text-on-accent)" strokeWidth={2} />
          </div>
        </button>
      )}

      {/* Resort list */}
      <div className="px-4 pt-4 pb-6">
        <p className="text-[0.65rem] font-black uppercase mb-3" style={{ color: MUTED }}>{t("map.allResorts")}</p>
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
                  {!isLive && resort.conditions === "fresh" && (
                    <span className="text-mono-label px-1.5 flex-shrink-0 badge-chill">{t("map.freshTag")}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="pulse-dot" style={{ width: 5, height: 5 }} />
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{t("map.riding", { n: resort.ridersNow })}</span>
                  {!isLive && (
                    <>
                      <span style={{ color: "var(--ink-3)" }}>·</span>
                      <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{resort.snowDepth} cm</span>
                      <span style={{ color: "var(--ink-3)" }}>·</span>
                      <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{t("map.lifts", { open: resort.liftsOpen, total: resort.totalLifts })}</span>
                    </>
                  )}
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
          ridesHere={ridesAt(activeSheet.resort, rides)}
          isLive={isLive}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </>
  );
}
