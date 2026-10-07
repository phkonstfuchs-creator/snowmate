"use client";

import { hasBackgroundLocation, watchPositions, type PositionWatch } from "@/features/tracking/position-source";
import { shareLocationAction } from "./actions";
import { shouldSendUpdate, type Position } from "./location";

/* Store apps only (ADR 0031, ADR 0032): one native watcher that keeps
   sending the shared position with the phone locked, from "Share" until
   the chosen end or "Stop", whichever tab is open. It lives at module
   level so leaving the Map tab does not stop it; the end time is kept on
   the device so a restarted app resumes it. */

const STORAGE_KEY = "pistl.sharingEnd";

export type BackgroundEvent =
  | { type: "position"; position: Position }
  | { type: "error"; error: "denied" | "unavailable" }
  | { type: "ended" };

type Listener = (event: BackgroundEvent) => void;

let watch: PositionWatch | null = null;
let endTimer: ReturnType<typeof setTimeout> | null = null;
let lastSent: { position: Position; at: number } | null = null;
let generation = 0;
const listeners = new Set<Listener>();

function emit(event: BackgroundEvent) {
  for (const listener of listeners) listener(event);
}

function remember(end: string | null) {
  try {
    if (end) window.localStorage.setItem(STORAGE_KEY, end);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: sharing still runs until the app is closed.
  }
}

export function onBackgroundSharing(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isBackgroundSharing(): boolean {
  return watch !== null;
}

export function stopBackgroundSharing(): void {
  generation += 1;
  watch?.stop();
  watch = null;
  if (endTimer) clearTimeout(endTimer);
  endTimer = null;
  lastSent = null;
  remember(null);
}

/* Returns false on the web, where the page's own watcher is used. */
export function startBackgroundSharing(end: string, texts: { title: string; message: string }): boolean {
  if (!hasBackgroundLocation()) return false;
  const remaining = Date.parse(end) - Date.now();
  if (!(remaining > 0)) {
    stopBackgroundSharing();
    return false;
  }
  remember(end);
  if (endTimer) clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    stopBackgroundSharing();
    emit({ type: "ended" });
  }, remaining);
  if (watch) return true;

  /* Answers that arrive after Stop belong to an old share: ignore them. */
  const current = ++generation;
  watch = watchPositions(
    (fix) => {
      const position: Position = { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy };
      emit({ type: "position", position });
      if (!shouldSendUpdate(lastSent, position, Date.now())) return;
      lastSent = { position, at: Date.now() };
      void shareLocationAction(position, null).then((result) => {
        if (current !== generation) return;
        if (result === "invalid") {
          // Ended elsewhere or expired on the server.
          stopBackgroundSharing();
          emit({ type: "ended" });
        } else if (result === "unavailable") {
          // Not sent: let the next fix try again right away, and say so.
          lastSent = null;
          emit({ type: "error", error: "unavailable" });
        }
      });
    },
    (error) => {
      if (error === "denied") stopBackgroundSharing();
      emit({ type: "error", error });
    },
    texts,
  );
  return true;
}

/* After an app restart: carry on if the stored end is still ahead. */
export function resumeBackgroundSharing(texts: { title: string; message: string }): boolean {
  let end: string | null = null;
  try {
    end = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    end = null;
  }
  return end ? startBackgroundSharing(end, texts) : false;
}
