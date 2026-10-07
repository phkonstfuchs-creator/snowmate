"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageKey } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n/client";
import { hasBackgroundLocation } from "@/features/tracking/position-source";
import { isBackgroundSharing, onBackgroundSharing, startBackgroundSharing, stopBackgroundSharing } from "./background-sharing";
import { friendLocationsAction, shareLocationAction, stopSharingAction } from "./actions";
import {
  SHARE_MESSAGES,
  geoErrorKey,
  shouldSendUpdate,
  toPosition,
  type FriendLocation,
  type Position,
  type ShareMinutes,
} from "./location";

const FRIEND_POLL_MS = 20_000;

/* The viewer's own GPS position (stays on the device unless sharing is
   on), their sharing state, and the positions friends share. Browsers
   stop GPS when the app is in the background, so on the web sharing only
   updates while the app is open; the UI says so. The store apps keep
   sending while the phone is locked, until sharing ends (ADR 0031). */
export function useLiveLocation({
  initialSharingEnd,
  initialFriends,
}: {
  initialSharingEnd: string | null;
  initialFriends: FriendLocation[] | null;
}) {
  const [me, setMe] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [sharingEnd, setSharingEnd] = useState<string | null>(initialSharingEnd);
  const [busy, setBusy] = useState(false);
  const [friends, setFriends] = useState<FriendLocation[] | null>(initialFriends);

  const watchId = useRef<number | null>(null);
  const lastSent = useRef<{ position: Position; at: number } | null>(null);
  const sharingRef = useRef(sharingEnd);
  useEffect(() => {
    sharingRef.current = sharingEnd;
  }, [sharingEnd]);

  const t = useT();
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  const onPositionValue = useCallback((position: Position) => {
    setMe(position);
    setLocating(false);
    setError(null);

    /* In the store apps the background watcher sends instead. */
    if (!sharingRef.current || isBackgroundSharing()) return;
    if (!shouldSendUpdate(lastSent.current, position, Date.now())) return;
    lastSent.current = { position, at: Date.now() };
    void shareLocationAction(position, null).then((result) => {
      if (result === "invalid") setSharingEnd(null); // ended elsewhere or expired
    });
  }, []);

  const onPosition = useCallback((geo: GeolocationPosition) => onPositionValue(toPosition(geo)), [onPositionValue]);

  /* Store apps: one background watcher sends while sharing, with the
     screen locked and on every tab; this screen only shows what it sees. */
  const backgroundTexts = useMemo(() => ({ title: t("loc.backgroundTitle"), message: t("loc.backgroundMessage") }), [t]);
  useEffect(() => {
    if (sharingEnd) startBackgroundSharing(sharingEnd, backgroundTexts);
  }, [sharingEnd, backgroundTexts]);
  useEffect(
    () =>
      onBackgroundSharing((event) => {
        if (event.type === "position") onPositionValue(event.position);
        else if (event.type === "ended") setSharingEnd(null);
        else setError(event.error === "denied" ? "loc.backgroundDenied" : "loc.backgroundFailed");
      }),
    [onPositionValue],
  );

  const onGeoError = useCallback((geoError: GeolocationPositionError) => {
    setLocating(false);
    setError(geoErrorKey(geoError));
    if (geoError.code === 1 && watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  /* Registers the GPS watcher; state only changes in its callbacks. */
  const startWatch = useCallback(() => {
    if (!supported || watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(onPosition, onGeoError, {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 20_000,
    });
  }, [onGeoError, onPosition, supported]);

  /* "Show my location": asks for permission on the person's tap. */
  const watch = useCallback(() => {
    if (!supported) {
      setError("loc.unsupported");
      return;
    }
    if (watchId.current === null) setLocating(true);
    startWatch();
  }, [startWatch, supported]);

  /* One fresh position, for starting to share. */
  const currentPosition = useCallback(
    () =>
      new Promise<Position>((resolve, reject) => {
        if (!supported) return reject(null);
        navigator.geolocation.getCurrentPosition(
          (geo) => resolve(toPosition(geo)),
          (geoError) => reject(geoError),
          { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
        );
      }),
    [supported],
  );

  const startSharing = useCallback(
    async (minutes: ShareMinutes) => {
      setBusy(true);
      setError(null);
      try {
        const position = me ?? (await currentPosition());
        setMe(position);
        const result = await shareLocationAction(position, minutes);
        if (result === "sharing" || result === "throttled") {
          lastSent.current = { position, at: Date.now() };
          const end = new Date(Date.now() + minutes * 60_000).toISOString();
          setSharingEnd(end);
          /* One GPS stream: the native one in the store apps, else the page's. */
          if (!startBackgroundSharing(end, backgroundTexts)) watch();
          return true;
        }
        setError(SHARE_MESSAGES[result]);
        return false;
      } catch (geoError) {
        setError(geoErrorKey(geoError as GeolocationPositionError | null));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [backgroundTexts, currentPosition, me, watch],
  );

  const stopSharing = useCallback(async () => {
    setBusy(true);
    const ok = await stopSharingAction();
    setBusy(false);
    if (ok) {
      stopBackgroundSharing();
      setSharingEnd(null);
      lastSent.current = null;
    } else {
      setError("common.unavailable");
    }
  }, []);

  /* Resume GPS when sharing was already on (e.g. after reopening the app). */
  useEffect(() => {
    if (initialSharingEnd && !hasBackgroundLocation()) startWatch();
  }, [initialSharingEnd, startWatch]);

  /* Sharing ends by itself at its end time. */
  useEffect(() => {
    if (!sharingEnd) return;
    const remaining = new Date(sharingEnd).getTime() - Date.now();
    const timer = setTimeout(() => setSharingEnd(null), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [sharingEnd]);

  /* Friends' positions while the page is visible. */
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void friendLocationsAction().then((next) => {
        if (active && next) setFriends(next);
      });
    };
    const timer = setInterval(refresh, FRIEND_POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return { me, locating, error, locate: watch, sharingEnd, busy, startSharing, stopSharing, friends, supported };
}
