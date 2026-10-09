"use client";

import { useEffect, useRef, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useT } from "@/lib/i18n/client";
import type { City } from "@/lib/types";
import { resortNamesIn } from "@/lib/resorts";
import { isPlanningDate } from "@/features/rides/planning-date";
import { translateText, translateValidation } from "@/lib/i18n/translate";
import { deleteDayPlan, saveDayPlan } from "./actions";
import type { DayPlan, DayPlanInput } from "./day-plan";
import styles from "./day-plans.module.css";

type DayPlanSheetProps = {
  initial?: DayPlan;
  city: City;
  onClose: () => void;
  onSaved: (plan: DayPlan) => void;
  onDeleted?: (id: string) => void;
  demo?: boolean;
};

function addCalendarDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function currentTimestamp(): number {
  return Date.now();
}

function viennaIsoDay(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localDemoPlan(id: string, input: DayPlanInput): DayPlan {
  const now = new Date().toISOString();
  return {
    id,
    version: 1,
    ...input,
    createdAt: now,
    updatedAt: now,
    expiresAt: `${addCalendarDays(input.planDate, 2)}T00:00:00.000Z`,
  };
}

export default function DayPlanSheet({ initial, city, onClose, onSaved, onDeleted, demo = false }: DayPlanSheetProps) {
  const t = useT();
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = initial?.id ?? crypto.randomUUID();
  const planId = idRef.current;
  const planCity = initial?.city ?? city;
  const [today, setToday] = useState(() => viennaIsoDay(currentTimestamp()));
  const [wasPastWhenOpened] = useState(() => Boolean(initial && initial.planDate < today));
  const initialExpiry = initial ? Date.parse(initial.expiresAt) : Number.POSITIVE_INFINITY;
  const [step, setStep] = useState(0);
  const [resort, setResort] = useState(initial?.resort ?? "");
  const [planDate, setPlanDate] = useState(initial?.planDate ?? today);
  const retainedPastPlan = wasPastWhenOpened || Boolean(initial && initial.planDate < today && planDate < today);
  const [meetTime, setMeetTime] = useState(initial?.meetTime.slice(0, 5) ?? "09:00");
  const [transport, setTransport] = useState<DayPlanInput["transport"] | "">(initial?.transport ?? "");
  const [meetingText, setMeetingText] = useState(initial?.meetingText ?? "");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicted, setConflicted] = useState(false);
  const [expired, setExpired] = useState(() => initialExpiry <= Date.now());
  const expiredRef = useRef(false);
  const nowRef = useRef(0);
  const expiryCloseRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const resorts = resortNamesIn(planCity);
  const maxDate = addCalendarDays(today, 365);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const expireAndClose = () => {
    if (!initial) return false;
    nowRef.current = currentTimestamp();
    if (!expiredRef.current && Date.parse(initial.expiresAt) > nowRef.current) return false;
    expiredRef.current = true;
    setExpired(true);
    if (!expiryCloseRef.current) {
      expiryCloseRef.current = true;
      onClose();
    }
    return true;
  };
  const isExpiredNow = () => expireAndClose();

  useEffect(() => {
    const expiresAt = initial ? Date.parse(initial.expiresAt) : Number.POSITIVE_INFINITY;
    let timer: number | undefined;
    let disposed = false;
    const checkExpiry = () => {
      if (disposed) return;
      nowRef.current = Date.now();
      setToday(viennaIsoDay(nowRef.current));
      if (!initial || expiresAt > nowRef.current) return;
      expiredRef.current = true;
      setExpired(true);
      if (!expiryCloseRef.current) {
        expiryCloseRef.current = true;
        onCloseRef.current();
      }
    };
    const scheduleCheck = () => {
      if (disposed) return;
      const now = Date.now();
      const untilExpiry = Math.max(0, expiresAt - now);
      const untilNextMinute = 60_000 - (now % 60_000);
      timer = window.setTimeout(() => {
        checkExpiry();
        if (!expiredRef.current) scheduleCheck();
      }, Math.min(untilExpiry, untilNextMinute, 2_147_483_647));
    };
    const refresh = () => {
      nowRef.current = Date.now();
      setToday(viennaIsoDay(nowRef.current));
      checkExpiry();
      if (expiresAt > nowRef.current) {
        if (timer !== undefined) window.clearTimeout(timer);
        scheduleCheck();
      }
    };
    scheduleCheck();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    checkExpiry();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initial]);

  const input = (): DayPlanInput => ({
    city: planCity,
    resort,
    planDate,
    meetTime,
    transport: transport as DayPlanInput["transport"],
    meetingText,
  });

  const stepError = (): string | null => {
    if (retainedPastPlan) return null;
    if (step === 0) {
      if (!resorts.includes(resort)) return "v.pickResort";
      if (!isPlanningDate(planDate, new Date())) return "v.dateWithinYear";
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(meetTime)) return "v.pickTime";
    }
    if (step === 1 && !transport) return "dayPlan.pickTransport";
    if (step === 2) {
      if (meetingText.trim().length < 2) return "v.addMeetPoint";
      if (meetingText.length > 120) return "v.max|120";
    }
    return null;
  };

  const next = () => {
    const issue = stepError();
    if (issue) {
      setError(translateValidation(t, issue));
      return;
    }
    setError(null);
    setStep((current) => Math.min(2, current + 1));
  };

  const save = async (close: () => void) => {
    if (busyRef.current) return;
    if (expireAndClose()) return;
    if (retainedPastPlan) return;
    const issue = stepError();
    if (issue) {
      setError(translateValidation(t, issue));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const form = input();
      if (demo) {
        if (isExpiredNow()) return;
        onSaved(localDemoPlan(planId, form));
        close();
        return;
      }
      const result = await saveDayPlan(planId, initial?.version ?? 0, form);
      if (isExpiredNow()) return;
      if (!result.ok || !result.plan) {
        if (result.message === "dayPlan.conflict") setConflicted(true);
        setError(translateValidation(t, result.message));
        return;
      }
      onSaved(result.plan);
      close();
    } catch {
      if (isExpiredNow()) return;
      setError(t("common.unavailable"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const remove = async (close: () => void) => {
    if (!initial || busyRef.current) return;
    if (expireAndClose()) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      if (demo) {
        if (isExpiredNow()) return;
        onDeleted?.(initial.id);
        close();
        return;
      }
      const result = await deleteDayPlan(initial.id, initial.version);
      if (isExpiredNow()) return;
      if (!result.ok) {
        if (result.message === "dayPlan.conflict") setConflicted(true);
        setError(translateText(t, result.message));
        return;
      }
      onDeleted?.(initial.id);
      close();
    } catch {
      if (isExpiredNow()) return;
      setError(t("common.unavailable"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (expired) return null;

  return (
    <Sheet
      title={t("go.title")}
      subtitle={t(initial ? "dayPlan.editSubtitle" : "dayPlan.createSubtitle")}
      onClose={onClose}
      className={styles.sheet}
    >
      {(close) => (
        <div className={styles.form}>
          {demo && <p className={styles.demoNote} role="note">{t("dayPlan.demoNote")}</p>}
          {retainedPastPlan && <p className={styles.privateNote} role="note">{t("dayPlan.pastReadOnly")}</p>}
          {conflicted && <p className={styles.conflictNote} role="status">{t("dayPlan.conflictAttention")}</p>}
          <div className={styles.progress} role="group" aria-label={t("dayPlan.stepOf", { step: step + 1, total: 3 })}>
            {[0, 1, 2].map((index) => <span key={index} className={index <= step ? styles.progressActive : undefined} />)}
          </div>

          {step === 0 && <section className={styles.step} aria-labelledby="day-plan-step-title">
            <p className={styles.eyebrow}>{t("dayPlan.stepOf", { step: 1, total: 3 })}</p>
            <h3 id="day-plan-step-title">{t("dayPlan.whereWhen")}</h3>
            <label className={styles.field} htmlFor="day-plan-resort">
              <span>{t("dayPlan.resort")}</span>
              <select id="day-plan-resort" value={resort} disabled={busy || conflicted || retainedPastPlan} onChange={(event) => setResort(event.target.value)}>
                <option value="">{t("dayPlan.chooseResort")}</option>
                {resorts.map((name) => <option value={name} key={name}>{name}</option>)}
              </select>
            </label>
            <div className={styles.twoFields}>
              <label className={styles.field} htmlFor="day-plan-date">
                <span>{t("dayPlan.date")}</span>
                <input id="day-plan-date" type="date" min={today} max={maxDate} value={planDate} disabled={busy || conflicted || retainedPastPlan} onChange={(event) => setPlanDate(event.target.value)} />
              </label>
              <label className={styles.field} htmlFor="day-plan-time">
                <span>{t("dayPlan.time")}</span>
                <input id="day-plan-time" type="time" value={meetTime} disabled={busy || conflicted || retainedPastPlan} onChange={(event) => setMeetTime(event.target.value)} />
              </label>
            </div>
            <p className={styles.hint}>{t("dayPlan.dateWindow")}</p>
          </section>}

          {step === 1 && <section className={styles.step} aria-labelledby="day-plan-step-title">
            <p className={styles.eyebrow}>{t("dayPlan.stepOf", { step: 2, total: 3 })}</p>
            <h3 id="day-plan-step-title">{t("dayPlan.transportTitle")}</h3>
            <p className={styles.hint}>{t("dayPlan.transportHint")}</p>
            <div className={styles.choices} role="radiogroup" aria-label={t("dayPlan.transportTitle")}>
              {(["own", "offer", "need"] as const).map((option) => (
                <label key={option} className={styles.choice} data-selected={transport === option}>
                  <input type="radio" name="day-plan-transport" value={option} checked={transport === option} disabled={busy || conflicted || retainedPastPlan} onChange={() => setTransport(option)} />
                  <span><strong>{t(`dayPlan.transport.${option}`)}</strong><small>{t(`dayPlan.transportHint.${option}`)}</small></span>
                </label>
              ))}
            </div>
            <p className={styles.caution}>{t("dayPlan.noSeatReserved")}</p>
          </section>}

          {step === 2 && <section className={styles.step} aria-labelledby="day-plan-step-title">
            <p className={styles.eyebrow}>{t("dayPlan.stepOf", { step: 3, total: 3 })}</p>
            <h3 id="day-plan-step-title">{t("dayPlan.meetingTitle")}</h3>
            <p className={styles.hint}>{t("dayPlan.meetingHint")}</p>
            <label className={styles.field} htmlFor="day-plan-meeting-text">
              <span>{t("dayPlan.meetingPoint")}</span>
              <textarea id="day-plan-meeting-text" rows={3} maxLength={120} value={meetingText} disabled={busy || conflicted || retainedPastPlan} onChange={(event) => setMeetingText(event.target.value)} placeholder={t("dayPlan.meetingPlaceholder")} />
            </label>
            <p className={styles.counter}>{t("common.characterCount", { n: meetingText.length, max: 120 })}</p>
            <p className={styles.privateNote}>{t("dayPlan.privateNote")}</p>
          </section>}

          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            {step > 0 && <button type="button" className={styles.secondary} disabled={busy || conflicted} onClick={() => { setStep((current) => current - 1); setError(null); }}>{t("common.back")}</button>}
            {step < 2 ? (
              <button type="button" className={styles.primary} disabled={busy || conflicted} onClick={next}>{t("common.next")}</button>
            ) : (
              <button type="button" className={styles.primary} disabled={busy || conflicted || retainedPastPlan} onClick={() => { nowRef.current = Date.now(); void save(close); }}>{busy ? t("common.saving") : t("dayPlan.save")}</button>
            )}
          </div>

          {initial && <div className={styles.deleteArea}>
            {!confirmDelete ? (
              <button type="button" className={styles.deleteButton} disabled={busy || conflicted} onClick={() => { setConfirmDelete(true); setError(null); }}>{t("dayPlan.delete")}</button>
            ) : (
              <div className={styles.confirm} role="group" aria-labelledby="day-plan-delete-title" aria-describedby="day-plan-delete-description">
                <h3 id="day-plan-delete-title">{t("dayPlan.deleteTitle")}</h3>
                <p id="day-plan-delete-description">{t("dayPlan.deleteConfirm")}</p>
                <div className={styles.actions}>
                  <button type="button" className={styles.secondary} autoFocus disabled={busy} onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</button>
                  <button type="button" className={styles.danger} disabled={busy || conflicted} onClick={() => { nowRef.current = Date.now(); void remove(close); }}>{busy ? t("common.oneMoment") : t("dayPlan.confirmDelete")}</button>
                </div>
              </div>
            )}
          </div>}
        </div>
      )}
    </Sheet>
  );
}
