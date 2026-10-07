"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin, Location } from "@capacitor-community/background-geolocation";
import type { Fix } from "./tracker";

/* Where a ski day's GPS fixes come from (ADR 0026, ADR 0031).
   In the store apps a native watcher keeps running while the phone is
   locked; on the web the browser's watchPosition is used, which pauses
   with the screen. Either way the fixes stay on this device. */

export type PositionError = "denied" | "unavailable";

export interface PositionWatch {
  stop(): void;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

export function hasBackgroundLocation(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("BackgroundGeolocation");
}

export function hasPositionSource(): boolean {
  return hasBackgroundLocation() || (typeof navigator !== "undefined" && "geolocation" in navigator);
}

export function fixFromNative(location: Location): Fix {
  return {
    lat: location.latitude,
    lng: location.longitude,
    alt: location.altitude,
    accuracy: location.accuracy,
    speed: location.speed,
    t: location.time ?? Date.now(),
  };
}

export function fixFromBrowser(geo: GeolocationPosition): Fix {
  return {
    lat: geo.coords.latitude,
    lng: geo.coords.longitude,
    alt: geo.coords.altitude,
    accuracy: geo.coords.accuracy,
    speed: geo.coords.speed,
    t: geo.timestamp || Date.now(),
  };
}

export function watchPositions(
  onFix: (fix: Fix) => void,
  onError: (error: PositionError) => void,
  texts: { title: string; message: string },
): PositionWatch {
  if (hasBackgroundLocation()) return watchNative(onFix, onError, texts);

  const id = navigator.geolocation.watchPosition(
    (geo) => onFix(fixFromBrowser(geo)),
    (geoError) => onError(geoError.code === 1 ? "denied" : "unavailable"),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  );
  return { stop: () => navigator.geolocation.clearWatch(id) };
}

function watchNative(
  onFix: (fix: Fix) => void,
  onError: (error: PositionError) => void,
  texts: { title: string; message: string },
): PositionWatch {
  let stopped = false;
  let watcherId: string | null = null;
  const remove = (id: string) => void BackgroundGeolocation.removeWatcher({ id }).catch(() => undefined);

  BackgroundGeolocation.addWatcher(
    {
      /* Setting a message is what keeps updates coming in the background;
         Android shows it as the ongoing notification. */
      backgroundTitle: texts.title,
      backgroundMessage: texts.message,
      requestPermissions: true,
      stale: false,
      distanceFilter: 5,
    },
    (location, error) => {
      if (stopped) return;
      if (error) {
        onError(error.code === "NOT_AUTHORIZED" ? "denied" : "unavailable");
        return;
      }
      if (location) onFix(fixFromNative(location));
    },
  ).then(
    (id) => {
      /* Stopped before the watcher was ready: remove it right away. */
      if (stopped) remove(id);
      else watcherId = id;
    },
    () => {
      if (!stopped) onError("unavailable");
    },
  );

  return {
    stop() {
      stopped = true;
      if (watcherId) remove(watcherId);
      watcherId = null;
    },
  };
}
