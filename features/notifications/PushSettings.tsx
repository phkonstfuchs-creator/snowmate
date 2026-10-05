"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { deletePushSubscriptionAction, savePushSubscriptionAction } from "./actions";
import { applicationServerKey } from "./push-subscription";

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

/* Opt-in push notices for this device (ADR 0025). Off until the person
   switches it on; the browser asks for permission at that moment. */
export default function PushSettings() {
  const t = useT();
  const [state, setState] = useState<PushState>("checking");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async (): Promise<PushState> => {
      if (!VAPID_PUBLIC_KEY) return "unsupported";
      if (!supported()) return needsInstall() ? "install" : "unsupported";
      if (Notification.permission === "denied") return "denied";
      const existing = await (await registration()).pushManager.getSubscription();
      if (!existing) return "off";
      /* Keeps the server in step, e.g. after another account used this browser. */
      await savePushSubscriptionAction(existing.toJSON()).catch(() => null);
      return "on";
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

  if (!VAPID_PUBLIC_KEY) return null;

  const turnOn = async () => {
    setFailed(false);
    setState("busy");
    try {
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
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t("push.toggle")}
            disabled={!canToggle}
            onClick={() => void (on ? turnOff() : turnOn())}
            className="relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50"
            style={{ background: on ? "var(--rust)" : "var(--paper-2)", borderRadius: 9999, boxShadow: on ? "none" : "inset 0 0 0 1px var(--border-rule)" }}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full transition-all"
              style={{ left: on ? "calc(100% - 1.5rem)" : "0.25rem", background: on ? "var(--on-accent)" : "var(--ink-2)", borderRadius: 9999 }}
            />
          </button>
        )}
      </div>
      {failed && <p role="status" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t("push.failed")}</p>}
    </section>
  );
}
