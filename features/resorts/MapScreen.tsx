"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
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
import { RESORT_ZOOM } from "@/components/map/map-style";
import { resortCoordinates } from "@/lib/resorts";
import { isNativeApp } from "@/lib/native-app";
import { useLiveLocation } from "@/features/location/useLiveLocation";
import LocationPanel from "@/features/location/LocationPanel";
import TrackPanel from "@/features/tracking/TrackPanel";
import { useTracking } from "@/features/tracking/TrackingProvider";
import type { FriendLocation } from "@/features/location/location";
import { initialsFor } from "@/features/profile/profile-input";
import ConditionsPanel, { ConditionsLine } from "@/features/conditions/ConditionsPanel";
import type { ResortConditions } from "@/features/conditions/conditions";
import type { ResortPhoto } from "./resort-photo";
import ResortPhotoCredit from "./ResortPhotoCredit";
import Image from "next/image";
import Link from "next/link";
import { LIFTS } from "@/lib/lifts";
import { useLiftMeetups } from "@/features/lift-meetup/useLiftMeetups";
import LiftMeetupPanel from "@/features/lift-meetup/LiftMeetupPanel";
import { START_MESSAGES, type LiftMeetup, type StartResult } from "@/features/lift-meetup/meetup";

const SkiMap = dynamic(() => import("@/components/map/SkiMap"), {
  ssr: false,
  loading: () => <div className="ski-map-placeholder" aria-hidden="true" />,
});

const SURFACE = "var(--bg-surface-1)";
const BORDER  = "var(--border-subtle)";
const MUTED   = "var(--text-tertiary)";
const INK     = "var(--text-primary)";

const CONDITIONS_LABELS: Record<ResortStatus["conditions"], MessageKey> = {
  fresh: "map.fresh", groomed: "map.groomed", icy: "map.icy", slushy: "map.slushy",
};

type ActiveMapSheet = { type: "resort"; resort: ResortStatus } | { type: "lift" } | null;

function LiftQuickStartSheet({ resorts, busy, result, onStart, onClose }: {
  resorts: ResortStatus[];
  busy: boolean;
  result: StartResult | null;
  onStart: (resort: string, liftId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  useScrollLock();
  const t = useT();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const available = resorts.filter((resort) => LIFTS.some((lift) => lift.resort === resort.name));
  const [selectedResort, setSelectedResort] = useState(available[0]?.name ?? "");
  const lifts = LIFTS.filter((lift) => lift.resort === selectedResort);
  const [selectedLift, setSelectedLift] = useState(lifts[0]?.id ?? "");

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel p-5" data-state={state} role="dialog" aria-modal="true"
        aria-label={t("meetup.quickStartTitle")} tabIndex={-1}>
        <div className="flex justify-between gap-3">
          <h2 className="font-display text-xl uppercase" style={{ color: INK }}>{t("meetup.quickStartTitle")}</h2>
          <button type="button" onClick={dismiss} aria-label={t("map.closeDetails")} className="min-h-11 min-w-11">
            <Icon name="x" size={18} color={MUTED} />
          </button>
        </div>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>{t("meetup.privacy")}</p>
        {available.length === 0 ? <p className="mt-4 text-sm">{t("meetup.noLifts")}</p> : (
          <>
            <label htmlFor="quick-resort" className="text-mono-label mt-5 block" style={{ color: INK }}>{t("meetup.pickResort")}</label>
            <select id="quick-resort" value={selectedResort} onChange={(event) => {
              const resort = event.target.value;
              setSelectedResort(resort);
              setSelectedLift(LIFTS.find((lift) => lift.resort === resort)?.id ?? "");
            }} className="mt-1 min-h-11 w-full px-2" style={{ border: "var(--rule-thin)", background: "var(--paper-0)", color: INK }}>
              {available.map((resort) => <option key={resort.name} value={resort.name}>{resort.name}</option>)}
            </select>
            <label htmlFor="quick-lift" className="text-mono-label mt-4 block" style={{ color: INK }}>{t("meetup.pickLift")}</label>
            <select id="quick-lift" value={selectedLift} onChange={(event) => setSelectedLift(event.target.value)}
              className="mt-1 min-h-11 w-full px-2" style={{ border: "var(--rule-thin)", background: "var(--paper-0)", color: INK }}>
              {lifts.map((lift) => <option key={lift.id} value={lift.id}>{lift.name}</option>)}
            </select>
            <p className="mt-3 text-xs" style={{ color: MUTED }}>{t("meetup.estimate")}</p>
            <button type="button" disabled={busy || !selectedLift}
              onClick={() => void onStart(selectedResort, selectedLift).then((ok) => { if (ok) dismiss(); })}
              className="card-tap mt-4 min-h-12 w-full font-display text-lg uppercase disabled:opacity-50"
              style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}>
              {busy ? t("common.oneMoment") : t("meetup.start")}
            </button>
            {result && result !== "sharing" && <p role="alert" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t(START_MESSAGES[result])}</p>}
          </>
        )}
      </div>
    </>
  );
}

function ResortDetailSheet({
  resort,
  ridesHere,
  isLive,
  conditions,
  photo,
  canShareLift,
  liftBusy,
  liftResult,
  onStartLift,
  onClose,
}: {
  resort: ResortStatus;
  ridesHere: LiveRide[];
  isLive: boolean;
  conditions: ResortConditions | null;
  photo: ResortPhoto | null;
  canShareLift: boolean;
  liftBusy: boolean;
  liftResult: StartResult | null;
  onStartLift: (liftId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  useScrollLock();
  const t = useT();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const openSpots = totalOpenSpots(ridesHere.map((ride) => ride.post));
  const resortLifts = LIFTS.filter((lift) => lift.resort === resort.name);
  const [selectedLift, setSelectedLift] = useState(resortLifts[0]?.id ?? "");
  /* Live lift opening counts have no data source yet. The prototype
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
          <div className="relative overflow-hidden" style={{ height: photo ? 190 : 118 }}>
            {photo ? (
              <Image
                src={photo.src}
                alt={resort.name}
                fill
                sizes="(max-width: 430px) 100vw, 430px"
                className="object-cover"
              />
            ) : (
              <ResortScene name={resort.name} className="absolute inset-0 w-full h-full" />
            )}
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

        {photo && <ResortPhotoCredit photo={photo} />}

        {isLive && <ConditionsPanel conditions={conditions} />}

        {isLive && (
          <div className="mx-5 mt-4 p-4" style={{ border: "var(--rule-thick)", background: "var(--paper-1)" }}>
            <h3 className="text-sm font-black" style={{ color: INK }}>{t("meetup.chooseLift")}</h3>
            <p className="mt-1 text-xs" style={{ color: MUTED }}>{resortLifts.length === 0 ? t("meetup.noLifts") : canShareLift ? t("meetup.privacy") : t("meetup.from16")}</p>
            {canShareLift && resortLifts.length > 0 && (
              <>
                <label htmlFor="lift-meetup-select" className="text-mono-label mt-3 block" style={{ color: INK }}>{t("meetup.pickLift")}</label>
                <select id="lift-meetup-select" value={selectedLift} onChange={(event) => setSelectedLift(event.target.value)}
                  className="mt-1 min-h-11 w-full px-2 text-sm" style={{ border: "var(--rule-thin)", background: "var(--paper-0)", color: INK }}>
                  {resortLifts.map((lift) => <option key={lift.id} value={lift.id}>{lift.name}</option>)}
                </select>
                <p className="mt-2 text-xs" style={{ color: MUTED }}>{t("meetup.estimate")}</p>
                <button type="button" disabled={liftBusy || !selectedLift} onClick={() => void onStartLift(selectedLift).then((ok) => { if (ok) dismiss(); })}
                  className="card-tap mt-3 min-h-11 w-full font-display text-lg uppercase disabled:opacity-50"
                  style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}>{liftBusy ? t("common.oneMoment") : t("meetup.start")}</button>
                {liftResult && liftResult !== "sharing" && <p role="alert" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t(START_MESSAGES[liftResult])}</p>}
              </>
            )}
          </div>
        )}

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
  canShareLift?: boolean;
  myLiftMeetup?: LiftMeetup | null;
  friendLiftMeetups?: LiftMeetup[] | null;
  /* Snow and weather by resort name; null when the provider is down. */
  conditions?: Record<string, ResortConditions | null> | null;
  /* Freely licensed photos by resort name, with their credits. */
  photos?: Record<string, ResortPhoto>;
  /* A position someone sent in a chat, opened from there. */
  pin?: { lat: number; lng: number; label: string } | null;
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
  const meetups = useLiftMeetups(live.myLiftMeetup ?? null, live.friendLiftMeetups === undefined ? [] : live.friendLiftMeetups);
  return <MapBody live={live} location={location} meetups={meetups} />;
}

const noSubscription = () => () => {};

function MapBody({ live, location, meetups }: { live?: LiveMap; location?: LocationState; meetups?: ReturnType<typeof useLiftMeetups> }) {
  const t = useT();
  const tracking = useTracking();
  /* The store apps have no demo (ADR 0031); false during server render. */
  const inNativeApp = useSyncExternalStore(noSubscription, () => isNativeApp(navigator.userAgent), () => false);
  const pin = live?.pin ?? null;
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(
    pin ? { lat: pin.lat, lng: pin.lng, zoom: 15, key: 1 } : null,
  );
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
  /* Opening a resort also flies the map there, close enough to read its
     pistes once the sheet is closed. */
  const openResort = (resort: ResortStatus) => {
    const coordinates = resortCoordinates(resort.name);
    if (coordinates) setFocus((prev) => ({ lat: coordinates[0], lng: coordinates[1], zoom: RESORT_ZOOM, key: (prev?.key ?? 0) + 1 }));
    setActiveSheet({ type: "resort", resort });
  };
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
  const totalRiders = resorts.reduce((s, r) => s + r.ridersNow, 0);
  const deepestSnow = [...resorts].sort((a, b) => b.snowDepth - a.snowDepth)[0];
  const conditionsOf = (name: string) => live?.conditions?.[name] ?? null;
  const freshest = resorts
    .map((resort) => ({ resort, conditions: conditionsOf(resort.name) }))
    .filter((item): item is { resort: ResortStatus; conditions: ResortConditions } => item.conditions !== null)
    .sort((a, b) => b.conditions.newSnowCm - a.conditions.newSnowCm)[0];

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
          {isLive && freshest && (
            <div className="text-right">
              <p className="text-mono-data" style={{ color: INK }}>
                {freshest.conditions.newSnowCm} cm
              </p>
              <p className="text-[0.65rem] font-semibold" style={{ color: MUTED }}>
                {t("cond.mostNewSnow")} · {freshest.resort.name}
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

      {location && meetups && (
        <LiftMeetupPanel
          mine={meetups.mine}
          friends={meetups.friends}
          me={location.me}
          busy={meetups.busy}
          result={meetups.result}
          onStop={() => void meetups.stop()}
          onLocate={location.locate}
          canShare={live?.canShareLift === true}
          onStartClick={() => setActiveSheet({ type: "lift" })}
        />
      )}
      {live && !inNativeApp && <p className="px-4 pt-2 text-xs" style={{ color: MUTED }}><Link href="/demo/map" className="underline">{t("meetup.tryDemo")}</Link></p>}

      {/* Vector map (MapLibre) */}
      <div style={{ height: location ? "52dvh" : 280, minHeight: 280, position: "relative", overflow: "hidden" }}>
        <SkiMap
          city={city}
          resorts={resorts}
          onSelect={openResort}
          me={location?.me ?? null}
          people={people}
          onPersonSelect={(id) => {
            const friend = location?.friends?.find((item) => item.userId === id);
            if (friend) focusOn(friend.lat, friend.lng);
          }}
          focus={focus}
          locateRequest={locateRequest}
          pin={pin}
          track={live ? tracking?.state?.track ?? null : null}
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

      {live && <TrackPanel />}

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

      {/* Resort list */}
      <div className="px-4 pt-4 pb-6">
        <p className="text-[0.65rem] font-black uppercase mb-3" style={{ color: MUTED }}>{t("map.allResorts")}</p>
        <div className="space-y-2">
          {sorted.map((resort, i) => (
            <button
              key={resort.name}
              className="card-tap w-full flex items-center gap-3 p-0 rounded-none overflow-hidden anim-fade-up text-left"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, animationDelay: `${i * 40}ms` }}
              onClick={() => openResort(resort)}
            >
              <div className="flex-1 min-w-0 py-3 pl-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm truncate" style={{ color: INK }}>{resort.name}</span>
                  {!isLive && resort.conditions === "fresh" && (
                    <span className="text-mono-label px-1.5 flex-shrink-0 badge-chill">{t("map.freshTag")}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="pulse-dot" style={{ width: 5, height: 5 }} />
                  <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{t("map.riding", { n: resort.ridersNow })}</span>
                  {isLive && conditionsOf(resort.name) && (
                    <>
                      <span style={{ color: "var(--ink-3)" }}>·</span>
                      <ConditionsLine conditions={conditionsOf(resort.name)!} />
                    </>
                  )}
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
          conditions={conditionsOf(activeSheet.resort.name)}
          photo={live?.photos?.[activeSheet.resort.name] ?? null}
          canShareLift={live?.canShareLift === true}
          liftBusy={meetups?.busy ?? false}
          liftResult={meetups?.result ?? null}
          onStartLift={(liftId) => meetups?.start(activeSheet.resort.name, liftId) ?? Promise.resolve(false)}
          onClose={() => setActiveSheet(null)}
        />
      )}
      {activeSheet?.type === "lift" && meetups && (
        <LiftQuickStartSheet
          resorts={resorts}
          busy={meetups.busy}
          result={meetups.result}
          onStart={meetups.start}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </>
  );
}
