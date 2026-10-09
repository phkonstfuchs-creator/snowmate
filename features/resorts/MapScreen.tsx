"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { consumeMapAction } from "./map-entry";
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
import { friendWhereabouts } from "@/features/location/whereabouts";
import CrewOnMap from "@/features/location/CrewOnMap";
import LiftStartSheet from "@/features/lift-meetup/LiftStartSheet";
import TrackPanel from "@/features/tracking/TrackPanel";
import { useTracking } from "@/features/tracking/TrackingProvider";
import type { FriendLocation } from "@/features/location/location";
import { initialsFor } from "@/features/profile/profile-input";
import ConditionsPanel from "@/features/conditions/ConditionsPanel";
import type { ResortConditions } from "@/features/conditions/conditions";
import type { ResortPhoto } from "./resort-photo";
import ResortExplorer from "./ResortExplorer";
import DemoLiftMeetupTryout from "@/features/demo/DemoLiftMeetupTryout";
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
            <span className="font-display text-base" style={{ color: INK, letterSpacing: 0 }}>
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
              className={clsx("rounded-[14px] p-3 text-center", cond ? `cond-${cond}` : "")}
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
                  className="card-tap mt-3 min-h-11 w-full text-base font-semibold disabled:opacity-50"
                  style={{ background: "var(--rust)", color: "var(--on-accent)" }}>{liftBusy ? t("common.oneMoment") : t("meetup.start")}</button>
                {liftResult && liftResult !== "sharing" && <p role="alert" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t(START_MESSAGES[liftResult])}</p>}
              </>
            )}
          </div>
        )}

        {/* Ability bars */}
        <div className="px-5 mt-4">
          <p className="text-[0.65rem] font-black mb-2.5" style={{ color: MUTED }}>{t("map.whoRidesWhat")}</p>
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
            <p className="text-[0.65rem] font-black mb-3" style={{ color: MUTED }}>{t("map.ridesHereToday")}</p>
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
  initialAction?: "lift" | null;
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
    initialFriends: live.friends === undefined ? [] : live.friends,
  });
  const meetups = useLiftMeetups(live.myLiftMeetup ?? null, live.friendLiftMeetups === undefined ? [] : live.friendLiftMeetups);
  return <MapBody live={live} location={location} meetups={meetups} />;
}

const noSubscription = () => () => {};
const noPosition = async () => null;

function MapBody({ live, location, meetups }: { live?: LiveMap; location?: LocationState; meetups?: ReturnType<typeof useLiftMeetups> }) {
  const t = useT();
  const tracking = useTracking();
  const router = useRouter();
  const [requestedLiftEntry] = useState(() => live?.initialAction === "lift");
  const entryConsumed = useRef(false);
  useEffect(() => {
    if (live?.initialAction !== "lift" || entryConsumed.current) return;
    entryConsumed.current = true;
    const nextUrl = consumeMapAction(window.location.href);
    if (nextUrl) router.replace(nextUrl, { scroll: false });
  }, [live?.initialAction, router]);
  /* The store apps have no demo (ADR 0031); false during server render. */
  const inNativeApp = useSyncExternalStore(noSubscription, () => isNativeApp(navigator.userAgent), () => false);
  const pin = live?.pin ?? null;
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(
    pin ? { lat: pin.lat, lng: pin.lng, zoom: 15, key: 1 } : null,
  );
  const [positionClock, setPositionClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setPositionClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const people = useMemo<MapPerson[]>(
    () =>
      (location?.friends ?? []).map((friend) => ({
        id: friend.userId,
        label: friend.name,
        initials: initialsFor(friend.name, friend.handle),
        lat: friend.lat,
        lng: friend.lng,
        stale: friendWhereabouts(friend, positionClock).stale,
      })),
    [location?.friends, positionClock],
  );
  const focusOn = (lat: number, lng: number, userId?: string) => {
    setFocus((previous) => ({ lat, lng, zoom: 14, key: (previous?.key ?? 0) + 1 }));
    setSelectedFriendId(userId ?? null);
    mapStage.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  };
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
  const [activeSheet, setActiveSheet] = useState<ActiveMapSheet>(() => live?.initialAction === "lift" && live.canShareLift === true ? { type: "lift" } : null);
  /* Keep both controls visible; active sharing also has a direct Stop. */
  const [panel, setPanel] = useState<"day" | "share" | null>(null);
  const mapStage = useRef<HTMLDivElement>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
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
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>{t("map.title")}</h1>
          <p className="text-xs" style={{ color: MUTED }}>{t("map.summary", { n: totalRiders, riding: isLive ? t("map.ridingToday") : t("map.ridingNow"), resorts: resorts.length })}</p>
        </div>
        {!isLive && <div className="text-right text-xs" style={{ color: MUTED }}><strong className="block text-lg" style={{ color: INK }}>{deepestSnow?.snowDepth ?? 0} cm</strong>{t("map.deepestSnow")}</div>}
        {isLive && freshest && <div className="max-w-[45%] text-right text-xs" style={{ color: MUTED }}><strong className="block text-lg" style={{ color: INK }}>{freshest.conditions.newSnowCm} cm</strong>{t("cond.mostNewSnow")} · {freshest.resort.name}</div>}
      </header>

      <div ref={mapStage} className="mountain-map-stage mx-3" aria-label={t("map.title")}>
        <SkiMap city={city} resorts={resorts} onSelect={openResort} me={location?.me ?? null} people={people}
          onPersonSelect={(id) => {
            const friend = location?.friends?.find((item) => item.userId === id);
            if (friend) focusOn(friend.lat, friend.lng, friend.userId);
          }} focus={focus} locateRequest={locateRequest} pin={pin} track={live ? tracking?.state?.track ?? null : null} />
        <div className="absolute left-3 right-[72px] top-3 rounded-full p-1" style={{ background: "var(--paper-0)", boxShadow: "var(--shadow-card)" }}>
          <SegmentedControl options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]} value={city}
            onChange={(next) => { setCity(next); setSelectedFriendId(null); setFocus(null); }} ariaLabel={t("common.region")} />
        </div>
        {location && <button type="button" onClick={() => { setLocateRequest(Date.now()); locateMe(); }} aria-label={t("loc.locateMe")}
          className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--paper-0)", boxShadow: "var(--shadow-card)" }}><Icon name="locate" size={20} color={location.me ? "#2f6fb2" : INK} /></button>}
        {location?.locating && <p role="status" className="absolute left-3 top-[72px] rounded-full px-3 py-2 text-xs" style={{ background: "var(--paper-0)", color: INK }}>{t("loc.locating")}</p>}
        {location && live?.canShareLift === true && <div className="absolute bottom-10 left-3 right-3">
          <p className="mb-2 inline-block rounded-full px-3 py-1 text-sm font-bold" style={{ background: "var(--paper-0)", color: INK }}>{t("coord.liftTitle")}</p>
          <div className="flex gap-2">
            <button type="button" disabled={meetups?.busy} onClick={() => setActiveSheet({ type: "lift" })}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--rust)", color: "var(--on-accent)", boxShadow: "var(--shadow-card)" }}>
              <Icon name="mountain" size={19} />{t(meetups?.mine ? "meetup.changeLift" : "meetup.quickStart")}
            </button>
            {meetups?.mine && <button type="button" onClick={() => void meetups.stop()} disabled={meetups.busy} className="min-h-12 rounded-full px-4 text-sm font-semibold disabled:opacity-50" style={{ background: "var(--paper-0)", color: "var(--crimson)" }}>{t("meetup.stop")}</button>}
          </div>
        </div>}
      </div>

      {requestedLiftEntry && live?.canShareLift !== true && <p role="status" className="mx-4 mt-3 rounded-2xl p-4 text-sm" style={{ background: "var(--paper-1)", color: INK }}>{t("meetup.from16")}</p>}

      {live && location && <div className="mx-3 mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPanel(panel === "day" ? null : "day")} aria-expanded={panel === "day"} aria-controls={panel === "day" ? "map-day-panel" : undefined}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold" style={{ background: "var(--paper-1)", color: INK }}>
          <Icon name="route" size={18} />{t("map.tabDay")}{tracking?.state && <span className="pulse-dot h-2 w-2" aria-label={t("track.running")} />}
        </button>
        <button type="button" onClick={() => setPanel(panel === "share" ? null : "share")} aria-expanded={panel === "share"} aria-controls={panel === "share" ? "map-share-panel" : undefined}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold" style={{ background: location.sharingEnd ? "var(--accent-primary-subtle)" : "var(--paper-1)", color: INK }}>
          <Icon name="radio" size={18} />{t("map.tabShare")}
        </button>
        {location.sharingEnd && <button type="button" onClick={() => void location.stopSharing()} aria-label={t("map.stopSharing")} disabled={location.busy} className="col-span-2 min-h-11 rounded-full px-3 text-sm font-semibold disabled:opacity-50" style={{ color: "var(--crimson)", background: "var(--paper-1)" }}>{t("loc.stop")}</button>}
      </div>}
      {live && panel === "day" && <div id="map-day-panel"><TrackPanel /></div>}
      {location && panel === "share" && <div id="map-share-panel"><LocationPanel sharingEnd={location.sharingEnd} canShare={live?.canShare !== false} busy={location.busy}
        error={location.error ? t(location.error) : null} friends={location.friends} showFriends={false} onShare={location.startSharing} onStop={() => void location.stopSharing()}
        onFocusFriend={(friend) => focusOn(friend.lat, friend.lng, friend.userId)} /></div>}
      {location?.friends === null && <p role="status" className="px-4 pt-3 text-sm" style={{ color: "var(--crimson)" }}>{t("loc.friendsUnavailable")}</p>}
      {location && <CrewOnMap compact now={positionClock} selectedId={selectedFriendId} friends={location.friends} onFocus={focusOn} />}
      {location && meetups && <LiftMeetupPanel compact mine={meetups.mine} friends={meetups.friends} me={location.me} busy={meetups.busy} result={meetups.result}
        onStop={() => void meetups.stop()} onLocate={location.locate} canShare={live?.canShareLift === true} />}
      {!live && <div className="mx-4 mt-4"><DemoLiftMeetupTryout compact /></div>}
      {location?.error && panel !== "share" && <p role="alert" className="px-4 pt-3 text-sm" style={{ color: "var(--crimson)" }}>{t(location.error)}</p>}
      {live && live.rides === null && <p role="status" className="mx-4 mt-3 rounded-2xl px-3 py-2.5 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>{t("map.unavailable")}</p>}
      <ResortExplorer resorts={sorted} onSelect={openResort} conditions={live?.conditions} photos={live?.photos} isLive={isLive} />
      {live && !inNativeApp && <p className="px-4 pb-4 text-sm" style={{ color: MUTED }}><Link href="/demo/map" className="underline">{t("meetup.tryDemo")}</Link></p>}

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
      {activeSheet?.type === "lift" && live?.canShareLift === true && meetups && (
        <LiftStartSheet
          resortNames={resorts.map((resort) => resort.name)}
          requestPosition={location?.locateOnce ?? noPosition}
          busy={meetups.busy}
          result={meetups.result}
          onStart={meetups.start}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </>
  );
}
