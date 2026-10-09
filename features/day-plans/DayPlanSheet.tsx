"use client";

import { useRef, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useT } from "@/lib/i18n/client";
import type { City } from "@/lib/types";
import { resortNamesIn } from "@/lib/resorts";
import { toIsoDay } from "@/features/rides/live-ride";
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
  const today = toIsoDay(new Date());
  const [step, setStep] = useState(0);
  const [resort, setResort] = useState(initial?.resort ?? "");
  const [planDate, setPlanDate] = useState(initial?.planDate ?? today);
  const [meetTime, setMeetTime] = useState(initial?.meetTime.slice(0, 5) ?? "09:00");
  const [transport, setTransport] = useState<DayPlanInput["transport"] | "">(initial?.transport ?? "");
  const [meetingText, setMeetingText] = useState(initial?.meetingText ?? "");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicted, setConflicted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const resorts = resortNamesIn(planCity);
  const maxDate = addCalendarDays(today, 365);

  const input = (): DayPlanInput => ({
    city: planCity,
    resort,
    planDate,
    meetTime,
    transport: transport as DayPlanInput["transport"],
    meetingText,
  });

  const stepError = (): string | null => {
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
        onSaved(localDemoPlan(planId, form));
        close();
        return;
      }
      const result = await saveDayPlan(planId, initial?.version ?? 0, form);
      if (!result.ok || !result.plan) {
        if (result.message === "dayPlan.conflict") setConflicted(true);
        setError(translateValidation(t, result.message));
        return;
      }
      onSaved(result.plan);
      close();
    } catch {
      setError(t("common.unavailable"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const remove = async (close: () => void) => {
    if (!initial || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      if (demo) {
        onDeleted?.(initial.id);
        close();
        return;
      }
      const result = await deleteDayPlan(initial.id, initial.version);
      if (!result.ok) {
        if (result.message === "dayPlan.conflict") setConflicted(true);
        setError(translateText(t, result.message));
        return;
      }
      onDeleted?.(initial.id);
      close();
    } catch {
      setError(t("common.unavailable"));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

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
          {conflicted && <p className={styles.conflictNote} role="status">{t("dayPlan.conflictAttention")}</p>}
          <div className={styles.progress} role="group" aria-label={t("dayPlan.stepOf", { step: step + 1, total: 3 })}>
            {[0, 1, 2].map((index) => <span key={index} className={index <= step ? styles.progressActive : undefined} />)}
          </div>

          {step === 0 && <section className={styles.step} aria-labelledby="day-plan-step-title">
            <p className={styles.eyebrow}>{t("dayPlan.stepOf", { step: 1, total: 3 })}</p>
            <h3 id="day-plan-step-title">{t("dayPlan.whereWhen")}</h3>
            <label className={styles.field} htmlFor="day-plan-resort">
              <span>{t("dayPlan.resort")}</span>
              <select id="day-plan-resort" value={resort} disabled={busy || conflicted} onChange={(event) => setResort(event.target.value)}>
                <option value="">{t("dayPlan.chooseResort")}</option>
                {resorts.map((name) => <option value={name} key={name}>{name}</option>)}
              </select>
            </label>
            <div className={styles.twoFields}>
              <label className={styles.field} htmlFor="day-plan-date">
                <span>{t("dayPlan.date")}</span>
                <input id="day-plan-date" type="date" min={today} max={maxDate} value={planDate} disabled={busy || conflicted} onChange={(event) => setPlanDate(event.target.value)} />
              </label>
              <label className={styles.field} htmlFor="day-plan-time">
                <span>{t("dayPlan.time")}</span>
                <input id="day-plan-time" type="time" value={meetTime} disabled={busy || conflicted} onChange={(event) => setMeetTime(event.target.value)} />
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
                  <input type="radio" name="day-plan-transport" value={option} checked={transport === option} disabled={busy || conflicted} onChange={() => setTransport(option)} />
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
              <textarea id="day-plan-meeting-text" rows={3} maxLength={120} value={meetingText} disabled={busy || conflicted} onChange={(event) => setMeetingText(event.target.value)} placeholder={t("dayPlan.meetingPlaceholder")} />
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
              <button type="button" className={styles.primary} disabled={busy || conflicted} onClick={() => void save(close)}>{busy ? t("common.saving") : t("dayPlan.save")}</button>
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
                  <button type="button" className={styles.danger} disabled={busy || conflicted} onClick={() => void remove(close)}>{busy ? t("common.oneMoment") : t("dayPlan.confirmDelete")}</button>
                </div>
              </div>
            )}
          </div>}
        </div>
      )}
    </Sheet>
  );
}
