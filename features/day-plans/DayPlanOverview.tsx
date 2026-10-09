"use client";

import { CalendarDays, CarFront, ChevronRight, LockKeyhole, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import type { DayPlan, DayPlanResult } from "./day-plan";
import styles from "./day-plans.module.css";

function viennaDateTime(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}.${String(now.getMilliseconds()).padStart(3, "0")}`;
}

function meetingDateTime(plan: DayPlan): string {
  return `${plan.planDate}T${plan.meetTime}:00.000`;
}

export default function DayPlanOverview({ result, onOpen, onRetry, onShare, demo = false }: {
  result: DayPlanResult;
  onOpen: (plan: DayPlan) => void;
  onRetry: () => void;
  onShare?: (plan: DayPlan) => void;
  demo?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refreshNow = () => setNow(Date.now());
    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", refreshNow);
    return () => {
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, []);

  const plansFromResult = result.status === "ok" ? result.plans : [];
  const nearestExpiry = plansFromResult.reduce((nearest, plan) => {
    const expiry = Date.parse(plan.expiresAt);
    return Number.isFinite(expiry) && expiry > now ? Math.min(nearest, expiry) : nearest;
  }, Number.POSITIVE_INFINITY);

  useEffect(() => {
    if (!Number.isFinite(nearestExpiry)) return;
    // Browsers clamp delays above 2^31-1. Refresh periodically as well so
    // plans still disappear promptly after a backgrounded tab is restored.
    const untilExpiry = Math.max(0, nearestExpiry - Date.now());
    const delay = Math.min(untilExpiry, 60_000, 2_147_483_647);
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [nearestExpiry, now]);

  if (result.status === "unavailable") {
    return <div className={styles.overviewState}>
      <p role="alert">{t("dayPlan.unavailable")}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>{t("status.retry")}</button>
    </div>;
  }

  const plans = [...plansFromResult]
    .filter((plan) => Date.parse(plan.expiresAt) > now)
    .sort((left, right) =>
    `${left.planDate}T${left.meetTime}`.localeCompare(`${right.planDate}T${right.meetTime}`),
  );
  if (!plans.length) return <p className={styles.empty}>{t("dayPlan.empty")}</p>;

  const currentViennaTime = viennaDateTime(new Date(now));
  const upcoming = plans.filter((plan) => meetingDateTime(plan) >= currentViennaTime);
  const previous = plans.filter((plan) => meetingDateTime(plan) < currentViennaTime);
  const [next, ...later] = upcoming;
  const formattedDate = (plan: DayPlan) => new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Vienna",
  }).format(new Date(`${plan.planDate}T12:00:00.000Z`));

  return <section className={styles.overview} aria-label={t("dayPlan.overviewTitle")}>
    {demo && <p className={styles.demoNote} role="note">{t("dayPlan.overviewDemo")}</p>}
    {next && <>
      <button type="button" className={styles.nextPlan} onClick={() => onOpen(next)}>
        <span className={styles.cardTop}><span className={styles.privateBadge}><LockKeyhole size={15} aria-hidden />{t("dayPlan.privateLabel")}</span><ChevronRight size={20} aria-hidden /></span>
        <strong className={styles.nextResort}>{next.resort}</strong>
        <span className={styles.planLine}><CalendarDays size={17} aria-hidden />{formattedDate(next)} · {next.meetTime.slice(0, 5)}</span>
        <span className={styles.planLine}><MapPin size={17} aria-hidden />{next.meetingText}</span>
        <span className={styles.planLine}><CarFront size={17} aria-hidden />{t(`dayPlan.transport.${next.transport}`)}</span>
      </button>
      {onShare && <button type="button" className={styles.share} onClick={() => onShare(next)}>{t("dayPlan.shareAsRide")}</button>}
    </>}
    {later.length > 0 && <div className={styles.laterPlans}>
      <h3>{t("dayPlan.morePlans")}</h3>
      {later.map((plan) => <div className={styles.laterRow} key={plan.id}>
        <button type="button" className={styles.laterOpen} onClick={() => onOpen(plan)} aria-label={`${plan.resort} · ${formattedDate(plan)}`}>
          <span><strong>{plan.resort}</strong><small>{formattedDate(plan)} · {plan.meetTime.slice(0, 5)}</small></span><ChevronRight size={18} aria-hidden />
        </button>
        {onShare && <button type="button" className={styles.laterShare} onClick={() => onShare(plan)}>{t("dayPlan.shareAsRide")}</button>}
      </div>)}
    </div>}
    {previous.length > 0 && <div className={styles.laterPlans}>
      <h3>{t("dayPlan.previousPlans")}</h3>
      {previous.map((plan) => <div className={styles.laterRow} key={plan.id}>
        <button type="button" className={styles.laterOpen} onClick={() => onOpen(plan)} aria-label={`${plan.resort} · ${formattedDate(plan)}`}>
          <span><strong>{plan.resort}</strong><small>{formattedDate(plan)} · {plan.meetTime.slice(0, 5)}</small></span><ChevronRight size={18} aria-hidden />
        </button>
      </div>)}
    </div>}
  </section>;
}
