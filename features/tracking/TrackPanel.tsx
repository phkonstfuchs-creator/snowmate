"use client";

import { useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";
import { isNativeApp } from "@/lib/native-app";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { formatDuration } from "./ski-day";
import { runsSoFar, verticalSoFar } from "./tracker";
import { useTracking } from "./TrackingProvider";
import type { TrackerError } from "./useSkiDayTracker";
import SkiDayStats from "./SkiDayStats";

const ERRORS: Record<TrackerError, MessageKey> = {
  unsupported: "track.unsupported",
  denied: "track.denied",
  unavailable: "track.noSignal",
};

const noSubscription = () => () => {};

/* On the map: start a ski day, watch its numbers, finish it. */
export default function TrackPanel() {
  const t = useT();
  const tracker = useTracking();
  /* The store apps keep recording with the screen off (ADR 0031); only a
     browser needs the "keep it open" hint. The server assumes a browser. */
  const inBrowser = useSyncExternalStore(noSubscription, () => !isNativeApp(navigator.userAgent), () => true);
  if (!tracker) return null;
  const { state, error, now, start, finish } = tracker;

  if (!state) {
    return (
      <section className="mx-4 mt-3 flex items-center gap-3 px-4 py-3" style={{ background: "var(--paper-1)", border: "var(--rule-thin)" }} aria-label={t("track.title")}>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink-0)" }}>{t("track.title")}</h2>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>{error ? t(ERRORS[error]) : t("track.pitch")}</p>
          {!error && inBrowser && <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>{t("track.keepOpen")}</p>}
        </div>
        <button
          type="button"
          onClick={start}
          className="flex min-h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold"
          style={{ background: "var(--rust)", color: "var(--on-accent)" }}
        >
          <Icon name="route" size={16} /> {t("track.start")}
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 mt-3 space-y-3 px-4 py-3" style={{ background: "var(--paper-1)", border: "var(--rule-thin)" }} aria-label={t("track.title")} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink-0)" }}>
          <span className="pulse-dot" style={{ width: 7, height: 7 }} aria-hidden /> {t("track.running")}
        </p>
        <button
          type="button"
          onClick={finish}
          className="flex min-h-11 items-center px-4 text-sm font-semibold"
          style={{ border: "var(--rule-thin)", color: "var(--ink-0)", background: "var(--paper-0)" }}
        >
          {t("track.finish")}
        </button>
      </div>
      <SkiDayStats
        distanceM={state.distanceM}
        verticalM={verticalSoFar(state)}
        maxSpeedKmh={state.maxSpeedMs * 3.6}
        runs={runsSoFar(state)}
        lead={{ value: formatDuration(now - state.startedAt), label: t("track.time") }}
      />
      <p className="text-xs" style={{ color: error ? "var(--crimson)" : "var(--ink-2)" }}>{error ? t(ERRORS[error]) : inBrowser ? t("track.keepOpen") : t("track.keepRunning")}</p>
    </section>
  );
}
