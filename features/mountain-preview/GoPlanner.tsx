"use client";

import { useState } from "react";
import { CalendarDays, CarFront, Check, ChevronLeft, ChevronRight, MapPin, Mountain, ShieldCheck, Users } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { toIsoDay } from "@/features/rides/live-ride";
import styles from "./go-planner.module.css";

export type PreviewDayPlan = {
  resort: string;
  date: string;
  time: string;
  transport: "own" | "offer" | "need";
  meeting: string;
  crew: string[];
};

type Props = {
  onClose: () => void;
  onComplete: (plan: PreviewDayPlan) => void;
};

const sampleCrew = ["Mia", "Ben"] as const;

function nextSaturday(now = new Date()) {
  const today = toIsoDay(now);
  const [year, month, day] = today.split("-").map(Number);
  if (!year || !month || !day) return today;
  const calendarDay = new Date(Date.UTC(year, month - 1, day, 12));
  const daysUntilSaturday = (6 - calendarDay.getUTCDay() + 7) % 7 || 7;
  return toIsoDay(new Date(Date.UTC(year, month - 1, day + daysUntilSaturday, 12)));
}

function localToday() {
  return toIsoDay(new Date());
}

export default function GoPlanner({ onClose, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [resort, setResort] = useState("Nordkette");
  const [date, setDate] = useState(nextSaturday);
  const [time, setTime] = useState("08:00");
  const [transport, setTransport] = useState<PreviewDayPlan["transport"]>("need");
  const [crew, setCrew] = useState<string[]>([]);
  const [meeting, setMeeting] = useState("Seegrube");
  const [customMeeting, setCustomMeeting] = useState("");
  const [error, setError] = useState("");

  const meetingOptions = resort === "Nordkette"
    ? ["Seegrube", "Talstation"]
    : ["Mutterberg Talstation", "Gamsgarten"];

  function chooseResort(value: string) {
    setResort(value);
    setMeeting(value === "Nordkette" ? "Seegrube" : "Mutterberg Talstation");
  }

  function toggleCrew(person: string) {
    setCrew((current) => current.includes(person)
      ? current.filter((name) => name !== person)
      : [...current, person]);
  }

  function next() {
    if (step === 1 && (!date || date < localToday())) {
      setError("Bitte wähl ein Datum ab heute.");
      return;
    }
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  function back() {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  }

  function complete(close: () => void) {
    const cleanMeeting = meeting === "custom" ? customMeeting.trim() : meeting;
    if (!cleanMeeting) {
      setError("Bitte gib deinen Treffpunkt ein.");
      return;
    }
    setError("");
    onComplete({ resort, date, time, transport, meeting: cleanMeeting, crew });
    close();
  }

  return (
    <Sheet
      title="Pistl Go"
      subtitle="Dein nächster Skitag."
      onClose={onClose}
      className={styles.sheet}
    >
      {(close) => (
        <div className={styles.content}>
          <div className={styles.topline}>
            <span className={styles.stepLabel}>PLANEN · {step} VON 3</span>
            <span className={styles.stepTrack} aria-hidden="true"><span style={{ width: `${(step / 3) * 100}%` }} /></span>
          </div>

          {step === 1 && (
            <section aria-labelledby="go-step-one" className={styles.step}>
              <div className={styles.introIcon}><Mountain size={20} aria-hidden="true" /></div>
              <h3 id="go-step-one" className={styles.heading}>Wo geht’s hin?</h3>
              <p className={styles.copy}>Ein guter Skitag braucht keine bestehende Fahrt. Leg einfach los.</p>

              <fieldset className={styles.fieldset}>
                <legend className={styles.label}>Skigebiet</legend>
                <div className={styles.choiceRow}>
                  {["Nordkette", "Stubai"].map((place) => (
                    <button key={place} type="button" className={`${styles.choice} ${resort === place ? styles.selected : ""}`} aria-pressed={resort === place} onClick={() => chooseResort(place)}>
                      <Mountain size={17} aria-hidden="true" />{place}
                    </button>
                  ))}
                </div>
              </fieldset>

              <a className={styles.resortCheck} href={resort === "Nordkette" ? "https://nordkette.com/en/cams/" : "https://www.stubaier-gletscher.com/stubai-live/webcams/"} target="_blank" rel="noopener noreferrer">Webcams vor der Fahrt checken <ChevronRight size={16} aria-hidden="true" /></a>

              <div className={styles.dateTime}>
                <label className={styles.field}>
                  <span className={styles.label}><CalendarDays size={15} aria-hidden="true" />Datum</span>
                  <input aria-label="Datum" type="date" value={date} min={localToday()} onChange={(event) => setDate(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Start</span>
                  <select aria-label="Startzeit" value={time} onChange={(event) => setTime(event.target.value)}>
                    {["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="go-step-two" className={styles.step}>
              <div className={styles.introIcon}><Users size={20} aria-hidden="true" /></div>
              <h3 id="go-step-two" className={styles.heading}>Wer wär dabei?</h3>
              <p className={styles.copy}>Dein Plan funktioniert auch solo. Crew kannst du dazunehmen, wenn du magst.</p>

              <fieldset className={styles.fieldset}>
                <legend className={styles.label}>Crew, wenn du schon wen im Kopf hast</legend>
                <p className={styles.sampleNote}>Beispielprofile · nur Vorschau, keine Einladung</p>
                <div className={styles.crewRow}>
                  {sampleCrew.map((person) => (
                    <label key={person} className={`${styles.crewOption} ${crew.includes(person) ? styles.crewSelected : ""}`}>
                      <input type="checkbox" checked={crew.includes(person)} onChange={() => toggleCrew(person)} />
                      <span className={styles.avatar} aria-hidden="true">{person[0]}</span>
                      <span>{person}<small>Beispiel</small></span>
                      {crew.includes(person) && <Check className={styles.crewCheck} size={16} aria-hidden="true" />}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.label}>Anreise</legend>
                <div className={styles.transportOptions}>
                  <label className={styles.transportOption}>
                    <input type="radio" name="go-transport" value="own" checked={transport === "own"} onChange={() => setTransport("own")} />
                    <CarFront size={18} aria-hidden="true" /><span>Bin mobil</span>
                  </label>
                  <label className={styles.transportOption}>
                    <input type="radio" name="go-transport" value="offer" checked={transport === "offer"} onChange={() => setTransport("offer")} />
                    <CarFront size={18} aria-hidden="true" /><span>Kann Platz anbieten</span>
                  </label>
                  <label className={styles.transportOption}>
                    <input type="radio" name="go-transport" value="need" checked={transport === "need"} onChange={() => setTransport("need")} />
                    <span className={styles.transitIcon} aria-hidden="true">↗</span><span>Such Mitfahrt</span>
                  </label>
                </div>
              </fieldset>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="go-step-three" className={styles.step}>
              <div className={styles.introIcon}><MapPin size={20} aria-hidden="true" /></div>
              <h3 id="go-step-three" className={styles.heading}>Wo treffen wir uns?</h3>
              <p className={styles.copy}>Such einen klaren Punkt am Berg. Du kannst später noch umplanen.</p>

              <fieldset className={styles.meetingChoices}>
                <legend className={styles.label}>Treffpunkt · {resort}</legend>
                {meetingOptions.map((place) => (
                  <label key={place} className={`${styles.meetingChoice} ${meeting === place ? styles.meetingSelected : ""}`}>
                    <input type="radio" name="go-meeting" value={place} checked={meeting === place} onChange={() => setMeeting(place)} />
                    <MapPin size={17} aria-hidden="true" />{place}
                    {meeting === place && <Check className={styles.meetingCheck} size={17} aria-hidden="true" />}
                  </label>
                ))}
                <label className={`${styles.meetingChoice} ${meeting === "custom" ? styles.meetingSelected : ""}`}>
                  <input type="radio" name="go-meeting" value="custom" checked={meeting === "custom"} onChange={() => setMeeting("custom")} />
                  <MapPin size={17} aria-hidden="true" />Eigener Treffpunkt
                </label>
              </fieldset>
              {meeting === "custom" && <input className={styles.customInput} aria-label="Eigener Treffpunkt" placeholder="z. B. bei der großen Tafel" value={customMeeting} onChange={(event) => setCustomMeeting(event.target.value)} autoFocus />}

              <div className={styles.summary}>
                <div><span>{resort}</span><span>{date} · {time} Uhr</span></div>
                <p>{crew.length ? `${crew.join(", ")} · Beispielprofile` : "Solo starten geht klar"} · {transport === "own" ? "Eigene Anreise" : transport === "offer" ? "Platz anbieten" : "Mitfahrt suchen"}</p>
              </div>
              <p className={styles.privacyNote}>Dein Plan bleibt in dieser Vorschau privat. Er ist nur auf dieser offenen Seite vorgemerkt; Neuladen entfernt ihn.</p>
            </section>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.actions}>
            {step > 1 ? (
              <button type="button" className={styles.backButton} onClick={back}><ChevronLeft size={18} aria-hidden="true" />Zurück</button>
            ) : <span />}
            {step < 3 ? (
              <button type="button" className={styles.primaryButton} onClick={next}>Weiter<ChevronRight size={18} aria-hidden="true" /></button>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={() => complete(close)}><Check size={18} aria-hidden="true" />Skitag vormerken</button>
            )}
          </div>
          <p className={styles.previewFootnote}><ShieldCheck size={14} aria-hidden="true" />Vorschau · keine echten Einladungen oder geteilten Pläne</p>
        </div>
      )}
    </Sheet>
  );
}
