"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import Switch from "@/components/ui/Switch";
import {
  deleteNativePushTokenAction,
  deletePushSubscriptionAction,
  isMyNativePushTokenAction,
  isMyPushSubscriptionAction,
  saveNativePushTokenAction,
  savePushSubscriptionAction,
} from "./actions";
import { applicationServerKey } from "./push-subscription";
import {
  askNativePermission,
  hasNativePush,
  nativePermission,
  registerNativePush,
  rememberNativeToken,
  storedNativeToken,
  unregisterNativePush,
} from "./native-push";

type PushState = "checking" | "unsupported" | "install" | "denied" | "off" | "on" | "busy";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function supported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/* iPhones get push only for apps added to the home screen. */
function needsInstall() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/u.test(navigator.userAgent) && !supported();
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/* The iPhone app's push (ADR 0031): same switch, native token. */
async function checkNative(): Promise<PushState> {
  if ((await nativePermission()) === "denied") return "denied";
  const token = storedNativeToken();
  if (token && (await isMyNativePushTokenAction(token).catch(() => false))) return "on";
  return "off";
}

async function turnOnNative(): Promise<PushState | "failed"> {
  const permission = await askNativePermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const token = await registerNativePush();
  if (!token || (await saveNativePushTokenAction(token)) !== "saved") return "failed";
  rememberNativeToken(token);
  return "on";
}

async function turnOffNative(): Promise<void> {
  const token = storedNativeToken();
  if (token) await deleteNativePushTokenAction(token);
  await unregisterNativePush();
  rememberNativeToken(null);
}

/* Opt-in push notices for this device (ADR 0025). Off until the person
   switches it on; the browser asks for permission at that moment. */
export default function PushSettings() {
  const t = useT();
  const [state, setState] = useState<PushState>("checking");
  const [failed, setFailed] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async (): Promise<PushState> => {
      if (hasNativePush()) {
        if (active) setNative(true);
        return checkNative();
      }
      if (!VAPID_PUBLIC_KEY) return "unsupported";
      if (!supported()) return needsInstall() ? "install" : "unsupported";
      if (Notification.permission === "denied") return "denied";
      const existing = await (await registration()).pushManager.getSubscription();
      if (!existing) return "off";
      /* A subscription from another account or revoked session must never
         become this account's opt-in just because settings were opened. */
      if (await isMyPushSubscriptionAction(existing.endpoint).catch(() => false)) return "on";
      await existing.unsubscribe();
      return "off";
    };
    void check()
      .catch((): PushState => "unsupported")
      .then((next) => {
        if (active) setState(next);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!VAPID_PUBLIC_KEY && !native) return null;

  const turnOn = async () => {
    setFailed(false);
    setState("busy");
    try {
      if (native) {
        const next = await turnOnNative();
        if (next === "failed") {
          setFailed(true);
          setState("off");
        } else {
          setState(next);
        }
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      const subscription =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY) }));
      const outcome = await savePushSubscriptionAction(subscription.toJSON());
      if (outcome !== "saved") {
        await subscription.unsubscribe().catch(() => false);
        setFailed(true);
        setState("off");
        return;
      }
      setState("on");
    } catch {
      setFailed(true);
      setState("off");
    }
  };

  const turnOff = async () => {
    setFailed(false);
    setState("busy");
    try {
      if (native) {
        await turnOffNative();
        setState("off");
        return;
      }
      const subscription = await (await registration()).pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setFailed(true);
      setState("on");
    }
  };

  const hint =
    state === "install" ? t("push.installFirst")
    : state === "unsupported" ? t("push.unsupported")
    : state === "denied" ? t("push.denied")
    : t("push.what");

  const on = state === "on";
  const canToggle = state === "on" || state === "off";

  return (
    <section className="px-4 pb-4" aria-busy={state === "busy" || state === "checking"}>
      <div className="section-rule">
        <h2 className="text-mono-label" style={{ color: "var(--ink-0)" }}>{t("push.title")}</h2>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>{hint}</p>
        {(canToggle || state === "busy") && (
          <Switch on={on} label={t("push.toggle")} disabled={!canToggle} onChange={(next) => void (next ? turnOn() : turnOff())} />
        )}
      </div>
      {state === "install" && (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--ink-2)" }}>
          <li>{t("push.installShare")}</li>
          <li>{t("push.installAdd")}</li>
          <li>{t("push.installOpen")}</li>
        </ol>
      )}
      {failed && <p role="status" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t("push.failed")}</p>}
    </section>
  );
}
