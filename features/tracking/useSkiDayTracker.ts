"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RESORTS } from "@/lib/resorts";
import { addFix, isTrackerState, nearestResort, startTracker, summarize, type SkiDaySummary, type TrackerState } from "./tracker";

const STORAGE_KEY = "pistl.skiday.v1";
const SAVE_EVERY_MS = 15_000;
const MAX_DAY_MS = 16 * 3600_000;

export type TrackerError = "unsupported" | "denied" | "unavailable";

export interface FinishedDay {
  summary: SkiDaySummary;
  resort: string | null;
}

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

function readStored(): TrackerState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!isTrackerState(value) || Date.now() - value.startedAt > MAX_DAY_MS) return null;
    return value;
  } catch {
    return null;
  }
}

function store(state: TrackerState | null) {
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or full storage: the day still runs in memory.
  }
}

/* Records a ski day on this device (ADR 0026). The track lives in memory
   and, so a reload does not lose it, in this browser's storage; it is
   deleted when the day ends. Browsers pause GPS while the screen is off,
   so the screen is kept on while recording where the device allows it. */
export function useSkiDayTracker() {
  const [state, setState] = useState<TrackerState | null>(null);
  const [finished, setFinished] = useState<FinishedDay | null>(null);
  const [error, setError] = useState<TrackerError | null>(null);
  const [now, setNow] = useState(0);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);
  const lastStored = useRef(0);
  const stateRef = useRef<TrackerState | null>(null);

  const keepAwake = useCallback(async () => {
    const nav = navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> } };
    if (!nav.wakeLock || wakeLock.current) return;
    try {
      wakeLock.current = await nav.wakeLock.request("screen");
    } catch {
      // Low battery mode or not allowed: recording still works while the screen is on.
    }
  }, []);

  const releaseAwake = useCallback(() => {
    void wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
  }, []);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const onFix = useCallback((geo: GeolocationPosition) => {
    const current = stateRef.current;
    if (!current) return;
    const next = addFix(current, {
      lat: geo.coords.latitude,
      lng: geo.coords.longitude,
      alt: geo.coords.altitude,
      accuracy: geo.coords.accuracy,
      speed: geo.coords.speed,
      t: geo.timestamp || Date.now(),
    });
    stateRef.current = next;
    setState(next);
    setError(null);
    if (Date.now() - lastStored.current > SAVE_EVERY_MS) {
      lastStored.current = Date.now();
      store(next);
    }
  }, []);

  const startWatch = useCallback(() => {
    if (watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(
      onFix,
      (geoError) => {
        if (geoError.code === 1) {
          stopWatch();
          setError("denied");
        } else {
          setError("unavailable");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
  }, [onFix, stopWatch]);

  /* A day still running from before a reload carries on. */
  useEffect(() => {
    const restored = readStored();
    if (!restored || !("geolocation" in navigator)) return;
    stateRef.current = restored;
    queueMicrotask(() => setState(restored));
    startWatch();
    void keepAwake();
  }, [startWatch, keepAwake]);

  /* The clock on screen, and the screen lock comes back after the app was hidden. */
  useEffect(() => {
    if (!state) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        wakeLock.current = null;
        void keepAwake();
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state, keepAwake]);

  useEffect(() => () => stopWatch(), [stopWatch]);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("unsupported");
      return;
    }
    const fresh = startTracker(Date.now());
    stateRef.current = fresh;
    lastStored.current = Date.now();
    store(fresh);
    setFinished(null);
    setError(null);
    setState(fresh);
    startWatch();
    void keepAwake();
  }, [startWatch, keepAwake]);

  const finish = useCallback(() => {
    const current = stateRef.current;
    stopWatch();
    releaseAwake();
    stateRef.current = null;
    store(null);
    setState(null);
    if (current) setFinished({ summary: summarize(current, Date.now()), resort: nearestResort(current.track, RESORTS) });
  }, [stopWatch, releaseAwake]);

  const clearFinished = useCallback(() => setFinished(null), []);

  return { state, finished, error, now, start, finish, clearFinished };
}

export type SkiDayTracker = ReturnType<typeof useSkiDayTracker>;
