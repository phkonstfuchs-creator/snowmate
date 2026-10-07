"use client";

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

/* Push in the iPhone app (ADR 0025, ADR 0031). The token goes to the
   server only after the person switches push on, exactly like web push.
   This device remembers the token only to switch it off again. */

const STORAGE_KEY = "pistl.nativePushToken";

export type NativePermission = "granted" | "denied" | "prompt";

export function hasNativePush(): boolean {
  return Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("PushNotifications");
}

export async function nativePermission(): Promise<NativePermission> {
  const { receive } = await PushNotifications.checkPermissions();
  return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
}

export async function askNativePermission(): Promise<NativePermission> {
  const { receive } = await PushNotifications.requestPermissions();
  return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
}

export function storedNativeToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberNativeToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: switching off then only works from the server side.
  }
}

/* Asks iOS for this install's APNs token. */
export async function registerNativePush(timeoutMs = 15_000): Promise<string | null> {
  return new Promise((resolve) => {
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    let done = false;
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      for (const handle of handles) void handle.then((h) => h.remove()).catch(() => undefined);
      resolve(token);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    handles.push(PushNotifications.addListener("registration", ({ value }) => finish(value)));
    handles.push(PushNotifications.addListener("registrationError", () => finish(null)));
    PushNotifications.register().catch(() => finish(null));
  });
}

export async function unregisterNativePush(): Promise<void> {
  await PushNotifications.unregister().catch(() => undefined);
}

/* Same rule as the service worker: only a path inside the app. */
export function safePushPath(value: unknown): string {
  return typeof value === "string" && /^\/(?!\/)[A-Za-z0-9/_-]{0,120}$/u.test(value) ? value : "/feed";
}

/* Tapping a notice opens its page. */
export function onNativePushTap(open: (path: string) => void): () => void {
  if (!hasNativePush()) return () => undefined;
  const handle = PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const data = notification.data as { url?: unknown } | undefined;
    open(safePushPath(data?.url));
  });
  return () => void handle.then((h) => h.remove()).catch(() => undefined);
}
