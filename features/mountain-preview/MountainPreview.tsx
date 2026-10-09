"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ArrowDownToLine, ArrowRight, CableCar, Camera, Check, ChevronRight, Compass, Flag, Home, Layers, MapPin, Mountain, Pause, Play, RotateCcw, Search, Settings2, ShieldCheck, Snowflake, UserRound, Users, X } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import GoPlanner, { type PreviewDayPlan } from "./GoPlanner";
import { pilotFeatures, type PilotFeature } from "./data/catalog";
import { formatPilotDuration } from "./data/duration";
import styles from "./mountain-preview.module.css";

const PilotMap = dynamic(() => import("./PilotMap"), { ssr: false, loading: () => <div className={styles.mapLoading}><Mountain size={28} /><span>Bergkarte wird vorbereitet …</span></div> });
type Tab = "today" | "mountain" | "crew" | "profile";
type Overlay = "go" | "cams" | "offline" | "meet" | null;
type MeetingTarget = { name: string; resort: string; time: string };
const sampleMeeting: MeetingTarget = { name: "Seegrube", resort: "Nordkette", time: "12:30" };
const navigation = [
  { id: "today", label: "Heute", icon: Home },
  { id: "mountain", label: "Berg", icon: Mountain },
  { id: "crew", label: "Crew", icon: Users },
  { id: "profile", label: "Ich", icon: UserRound },
] as const;
const difficultyNames: Record<string, string> = { novice: "Übungspiste", easy: "Leicht", intermediate: "Mittel", advanced: "Schwer", expert: "Sehr schwer", freeride: "Freeride" };

function Avatar({ name, tone = "blue", small = false }: { name: string; tone?: string; small?: boolean }) {
  return <span aria-hidden="true" className={`${styles.avatar} ${styles[tone]} ${small ? styles.smallAvatar : ""}`}>{name[0]}</span>;
}

export default function MountainPreview() {
  const [tab, setTab] = useState<Tab>("today");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [plans, setPlans] = useState<PreviewDayPlan[]>([]);
  const plan = plans[0] ?? null;
  const [meetingTarget, setMeetingTarget] = useState<MeetingTarget>(sampleMeeting);
  const [mode, setMode] = useState<"map" | "day">("map");
  const [terrain, setTerrain] = useState(false);
  const [selected, setSelected] = useState<PilotFeature | null>(null);
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [crewTab, setCrewTab] = useState<"friends" | "discover">("friends");
  const [sharingPreview, setSharingPreview] = useState(false);
  const [rsvp, setRsvp] = useState(false);
  const [discoveryIndex, setDiscoveryIndex] = useState(0);
  const [requestPreview, setRequestPreview] = useState(false);
  const [cardDrag, setCardDrag] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const cardStart = useRef<{ x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!playing || tab !== "mountain" || mode !== "day") return;
    const interval = window.setInterval(() => setProgress((value) => Math.min(100, value + speed * 0.7)), 200);
    return () => window.clearInterval(interval);
  }, [playing, speed, tab, mode]);

  function openMeeting(target: MeetingTarget = sampleMeeting) {
    setMeetingTarget(target);
    setRsvp(false);
    setOverlay("meet");
  }

  function navigate(next: Tab) {
    setPlaying(false);
    setTab(next);
    contentRef.current?.scrollTo?.({ top: 0 });
  }

  function switchMode(next: "map" | "day") {
    setPlaying(false);
    setSelected(null);
    setQuery("");
    setMode(next);
  }

  function beginSwipe(event: TouchEvent) {
    if ((event.target as HTMLElement).closest("button, input, a")) return;
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function endSwipe(event: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    const end = event.changedTouches[0];
    if (!start || !end) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setCrewTab(dx < 0 ? "discover" : "friends");
  }

  function advanceRider() {
    setDiscoveryIndex((value) => value + 1);
    setRequestPreview(false);
  }

  function startCardSwipe(event: TouchEvent) {
    event.stopPropagation();
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    cardStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function moveCardSwipe(event: TouchEvent) {
    event.stopPropagation();
    const start = cardStart.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      cardStart.current = null;
      setCardDrag(0);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) * 1.5) setCardDrag(Math.max(-70, Math.min(70, dx)));
  }

  function endCardSwipe(event: TouchEvent) {
    event.stopPropagation();
    const start = cardStart.current;
    const touch = event.changedTouches[0];
    cardStart.current = null;
    setCardDrag(0);
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) advanceRider();
    else setRequestPreview(true);
  }

  const searchResults = query.trim() ? pilotFeatures.filter((feature) => feature.name.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de"))).slice(0, 6) : [];
  const replaySeconds = Math.round(progress * 1.2);
  const replayTime = `10:${String(32 + Math.floor(replaySeconds / 60)).padStart(2, "0")}:${String(replaySeconds % 60).padStart(2, "0")}`;
  const person = discoveryIndex % 2 === 0 ? { name: "Jules", level: "Rote Pisten", style: "Snowboard · Park & Piste", initial: "J" } : { name: "Noah", level: "Blaue & rote Pisten", style: "Ski · Entspannte Runden", initial: "N" };

  return (
    <div className={styles.app} lang="de">
      <div className={styles.previewBar}>Designvorschau <span>· Beispieldaten für Crew & Replay</span></div>
      <header className={styles.header}>
        <button className={styles.wordmark} onClick={() => navigate("today")} aria-label="Pistl Startseite">pistl<span>.</span></button>
        <span className={styles.region}><MapPin size={13} aria-hidden="true" />Innsbruck</span>
        <button className={styles.profileButton} onClick={() => navigate("profile")} aria-label="Dein Profil"><Avatar name="Lena" tone="pine" small /></button>
      </header>

      <main ref={contentRef} className={`${styles.main} ${tab === "mountain" ? styles.mountainMain : ""}`}>
        {tab === "today" && <div className={styles.page}>
          <div className={styles.pageHeading}><div><p className={styles.eyebrow}>HEY LENA</p><h1>Dein Bergtag.</h1></div><span className={styles.dayIcon}><Snowflake size={25} aria-hidden="true" /></span></div>
          <section className={styles.crewStrip} aria-label="Crew auf einen Blick">
            <div className={styles.avatarStack}><Avatar name="Mia" /><Avatar name="Ben" tone="peach" /></div>
            <div><strong>Zusammen ist besser.</strong><p>Mia & Ben · Beispiel-Crew</p></div>
            <button aria-label="Deine Crew ansehen" onClick={() => navigate("crew")}><ChevronRight size={21} aria-hidden="true" /></button>
          </section>

          <section className={styles.meetingCard}>
            <div className={styles.meetingIcon}><Flag size={22} aria-hidden="true" /></div>
            <div><p className={styles.eyebrow}>{plan ? "DEIN TREFFPUNKT · PRIVATER ENTWURF" : "GEMEINSAME RUNDE · BEISPIEL"}</p><h2>{plan ? `${plan.time} · ${plan.meeting}` : "12:30 · Seegrube"}</h2><p>{plan ? plan.resort : "Mia & Ben · Nordkette"}</p></div>
            <button className={styles.meetButton} aria-label="Treffpunkt ansehen" onClick={() => openMeeting(plan ? { name: plan.meeting, resort: plan.resort, time: plan.time } : sampleMeeting)}><ArrowRight size={20} aria-hidden="true" /></button>
          </section>

          <div className={styles.homeGrid}>
            <section className={styles.goCard}>
              <div className={styles.goTop}><span className={styles.goLabel}>PISTL GO</span><ArrowRight size={23} aria-hidden="true" /></div>
              <h2>{plan ? "Dein Plan steht." : <>Morgen Berg.<br />Wer kommt mit?</>}</h2>
              {plan ? <><p>{plan.resort} · {new Intl.DateTimeFormat("de", { day: "numeric", month: "short" }).format(new Date(`${plan.date}T12:00:00`))} · {plan.time} Uhr</p><div className={styles.planDetail}><MapPin size={16} aria-hidden="true" />{plan.meeting}</div><p className={styles.footnote}>Nur in dieser Vorschau · privat, nicht versendet.</p></> : <p>Gebiet wählen. Anreise klären.<br />Deine Crew zusammenbringen.</p>}
              <button className={styles.primary} onClick={() => setOverlay("go")}>{plan ? "Neuen Skitag planen" : "Skitag planen"}<ArrowRight size={19} aria-hidden="true" /></button>
              {!plan && <span className={styles.goHint}>Geht auch ohne bestehende Ausfahrt.</span>}
            </section>

            <div className={styles.homeSide}>
              <button className={styles.mountainCard} onClick={() => navigate("mountain")}>
                <span className={styles.mountainIllustration} aria-hidden="true"><svg viewBox="0 0 320 120"><path d="M-10 120 72 29 118 71 167 8 244 97 274 59 330 120Z" fill="#c6d5dc" /><path d="m58 44 14-15 28 25-17-5-11 4-7-13Zm82-1 27-35 38 43-24-9-14 8-12-18Z" fill="#fff" /><path d="m-10 120 92-58 46 40 64-29 73 47Z" fill="#a0b8c4" /></svg></span>
                <span className={styles.mountainCardBody}><span className={styles.eyebrow}>DEIN BERG IM BLICK</span><strong>Nordkette</strong><span>Pisten, Lifte & Webcams <ArrowRight size={16} aria-hidden="true" /></span></span>
              </button>
              <div className={styles.quickActions}><button onClick={() => setOverlay("cams")}><Camera size={20} aria-hidden="true" /><span>Webcams</span></button><button onClick={() => setOverlay("offline")}><ArrowDownToLine size={20} aria-hidden="true" /><span>Offlinekarte</span></button></div>
            </div>
          </div>


          {plans.length > 1 && <section aria-label="Weitere private Entwürfe" className={styles.previousPlans}><h2>Weitere private Entwürfe</h2>{plans.slice(1).map((draft, index) => <button key={index} onClick={() => openMeeting({ name: draft.meeting, resort: draft.resort, time: draft.time })}><span>{draft.resort} · {draft.date} · {draft.time}</span><ArrowRight size={16} /></button>)}</section>}
        </div>}

        {tab === "mountain" && <section className={styles.mountainScreen} aria-label="Bergkarte">
          <div className={styles.mapTop}>
            <div className={styles.mapTitle}><div><p className={styles.eyebrow}>BERG</p><h1>Nordkette</h1></div><span className={styles.pilotBadge}>OSM-Pilot</span></div>
            <div className={styles.mapModes}><button aria-pressed={mode === "map"} onClick={() => switchMode("map")}>Karte</button><button aria-pressed={mode === "day"} onClick={() => switchMode("day")}>Mein Tag</button></div>
          </div>
          <div className={styles.mapViewport}>
            <PilotMap mode={mode} selectedId={selected?.id ?? null} onSelect={setSelected} replayProgress={progress} terrain={terrain} />
            {mode === "map" && <div className={styles.mapSearch}>
              <label className={styles.search}><Search size={17} aria-hidden="true" /><input type="search" aria-label="Piste oder Lift suchen" placeholder="Piste oder Lift suchen" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              {query.trim() && <div className={styles.searchResults}>{searchResults.length ? searchResults.map((feature) => <button key={feature.id} aria-label={`${feature.name} auswählen`} onClick={() => { setSelected(feature); setQuery(""); }}>{feature.kind === "lift" ? <CableCar size={17} aria-hidden="true" /> : <Mountain size={17} aria-hidden="true" />}<span>{feature.name}</span><ChevronRight size={16} aria-hidden="true" /></button>) : <p>Keine passende Piste oder Lift im Pilotnetz.</p>}</div>}
            </div>}
            <div className={styles.mapTools}><button aria-label={terrain ? "2D-Karte anzeigen" : "3D-Gelände anzeigen"} aria-pressed={terrain} onClick={() => setTerrain((value) => !value)}><Layers size={18} aria-hidden="true" /><span>{terrain ? "2D" : "3D"}</span></button><button aria-label="Webcams" onClick={() => setOverlay("cams")}><Camera size={19} aria-hidden="true" /></button></div>
            <div className={styles.mapLegend}><span><i className={styles.pisteBlue} />Leicht</span><span><i className={styles.pisteRed} />Mittel</span><span><i className={styles.pisteBlack} />Schwer</span><span><i className={styles.pisteOther} />Sonstige</span></div>
          </div>

          <div className={styles.mapDrawer}>
            {mode === "day" ? <>
              <div className={styles.replayHead}><div><p className={styles.eyebrow}>Beispielroute · keine GPS-Aufnahme</p><h2>Wiedergabe · {replayTime}</h2></div><Avatar name="Lena" tone="pine" small /></div>
              <input className={styles.timeline} type="range" aria-label="Wiedergabezeit" min="0" max="100" value={progress} onChange={(event) => { setPlaying(false); setProgress(Number(event.target.value)); }} />
              <div className={styles.replayControls}><button aria-label={playing && progress < 100 ? "Wiedergabe pausieren" : "Wiedergabe starten"} onClick={() => { if (progress >= 100) setProgress(0); setPlaying((value) => progress >= 100 ? true : !value); }}>{playing && progress < 100 ? <Pause size={19} /> : <Play size={19} />}</button><button aria-label="Wiedergabe zum Anfang" onClick={() => { setPlaying(false); setProgress(0); }}><RotateCcw size={18} /></button><div className={styles.speedChoices} aria-label="Wiedergabegeschwindigkeit">{[1, 2, 4].map((value) => <button key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}×</button>)}</div><span className={styles.replayNote}>Nur Replay</span></div>
            </> : selected ? <>
              <div className={styles.featureHead}><div><p className={styles.eyebrow}>{selected.kind === "lift" ? "LIFT" : selected.difficulty === "freeride" ? "SKIROUTE" : "PISTE"} · OSM-GEOMETRIE</p><h2>{selected.name}</h2></div><button aria-label="Auswahl schließen" onClick={() => setSelected(null)}><X size={18} /></button></div>
              <p className={styles.featureStatus}>Betriebsstatus unbekannt</p>
              <p className={styles.footnote}>{selected.kind === "lift" ? `${formatPilotDuration(selected.duration) ? `OSM-Fahrzeit: ${formatPilotDuration(selected.duration)} · noch nicht validiert` : "Fahrzeit nicht belegt"} · Wartezeit unbekannt` : `${difficultyNames[selected.difficulty ?? ""] ?? "Schwierigkeit nicht angegeben"} · Verlauf aus OpenStreetMap`}</p>
              <p className={styles.footnote}>Geometrie-Import: 09.10.2026 · kein Live-Betriebsstatus</p>
              <button className={styles.textAction} onClick={() => openMeeting({ name: selected.name, resort: "Nordkette", time: "12:30" })}>Treffen planen<ArrowRight size={16} /></button>
            </> : <>
              <div className={styles.drawerCrew}><div className={styles.avatarStack}><Avatar name="Mia" small /><Avatar name="Ben" tone="peach" small /></div><div><h2>Deine Crew. Ein Treffpunkt.</h2><p>Seegrube · 12:30 · Beispielplan</p></div><button aria-label="Treffpunkt ansehen" onClick={() => openMeeting()}><ArrowRight size={19} /></button></div>
              <p className={styles.mapHint}>Piste oder Lift antippen · {pilotFeatures.length} importierte Geometrien</p>
            </>}
          </div>
        </section>}

        {tab === "crew" && <div className={styles.page}>
          <div className={styles.pageHeading}><div><p className={styles.eyebrow}>GUTE LEUTE. GUTE RUNDEN.</p><h1>Deine Crew.</h1></div><Users size={25} /></div>
          <div className={styles.crewTabs} role="tablist" aria-label="Crew-Bereich">{[{ id: "friends", label: "Meine Crew" }, { id: "discover", label: "Entdecken" }].map(({ id, label }) => <button key={id} id={`crew-${id}`} role="tab" aria-selected={crewTab === id} aria-controls="crew-panel" tabIndex={crewTab === id ? 0 : -1} onClick={() => setCrewTab(id as "friends" | "discover")} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); const next = event.key === "ArrowLeft" ? "friends" : "discover"; setCrewTab(next); document.getElementById(`crew-${next}`)?.focus(); } }}>{label}</button>)}</div>
          <div id="crew-panel" role="tabpanel" aria-labelledby={`crew-${crewTab}`} className={styles.crewPanel} onTouchStart={beginSwipe} onTouchEnd={endSwipe} onTouchCancel={() => { touchStart.current = null; }}>
            {crewTab === "friends" ? <><p className={styles.sectionIntro}>Der nächste Treffpunkt gehört ganz nach vorn.</p><button className={styles.crewMeeting} onClick={() => openMeeting()}><Flag size={23} /><span><strong>Seegrube · 12:30</strong><small>Mia & Ben · Beispielplan</small></span><ArrowRight size={20} /></button>{[{ name: "Mia", level: "Rote Pisten", note: "Ski · gemeinsam cruisen", tone: "blue" }, { name: "Ben", level: "Blaue & rote Pisten", note: "Snowboard · Park & Piste", tone: "peach" }].map((friend) => <div className={styles.friendRow} key={friend.name}><Avatar name={friend.name} tone={friend.tone} /><div><h2>{friend.name}</h2><p>{friend.level}</p><small>{friend.note} · Beispielprofil</small></div><span className={styles.friendTag}>Crew</span></div>)}<p className={styles.footnote}>Ohne Standortfreigabe bleibt der vereinbarte Treffpunkt sichtbar.</p><button className={styles.secondary} onClick={() => setOverlay("go")}>Gemeinsamen Skitag planen<ArrowRight size={18} /></button></> : <><p className={styles.sectionIntro}>Passender Fahrstil. Gleiche Runde.</p><div className={styles.discoveryCard} role="group" aria-label="Rider-Vorschau" style={{ transform: `translateX(${cardDrag}px) rotate(${cardDrag / 25}deg)` }} onTouchStart={startCardSwipe} onTouchMove={moveCardSwipe} onTouchEnd={endCardSwipe} onTouchCancel={(event) => { event.stopPropagation(); cardStart.current = null; setCardDrag(0); }}><div className={styles.discoveryArtwork} aria-hidden="true"><span>{person.initial}</span><Mountain size={90} strokeWidth={1} /></div><div className={styles.discoveryBody}><span className={styles.pilotBadge}>Beispiel · aus dem Freundeskreis</span><h2>{person.name}</h2><strong>{person.level}</strong><p>{person.style}</p></div></div><div className={styles.discoveryActions}><button className={styles.secondary} onClick={advanceRider}>Weiter</button><button className={styles.primary} onClick={() => setRequestPreview(true)}>{requestPreview ? <><Check size={17} />Vorgemerkt</> : "Zusammen fahren"}</button></div><p className={styles.swipeHint}>Links: weiter · Rechts: zusammen fahren</p>{requestPreview && <p role="status" className={styles.footnote}>Nur Vorschau · keine Anfrage versendet.</p>}</>}
          </div>
        </div>}

        {tab === "profile" && <div className={styles.page}>
          <div className={styles.pageHeading}><div><p className={styles.eyebrow}>DEIN PROFIL</p><h1>Hey, Lena.</h1></div><Settings2 size={24} /></div>
          <section className={styles.profileIntro}><Avatar name="Lena" tone="pine" /><div><h2>Lena · 16</h2><p>Dein Beispielprofil · Innsbruck</p><small>Zwischen Schule & Skitag.</small></div></section>
          <div className={styles.profileChips}><span>Ski</span><span>Rote Pisten</span><span>Gemeinsam cruisen</span></div>
          <section className={styles.sharingCard}><div className={styles.sharingTitle}><ShieldCheck size={22} /><h2>Für deine Freunde sichtbar.</h2></div><p>Standort freiwillig teilen, bis du ihn ausschaltest. Nur für bestätigte Freunde.</p><div className={styles.switchRow}><div><strong>Dauerhaft für Freunde</strong><small>Entwurf für die native App</small></div><button role="switch" aria-label="Dauerhaft für Freunde — Vorschau" aria-checked={sharingPreview} className={styles.switch} onClick={() => setSharingPreview((value) => !value)}><span /></button></div><p className={styles.footnote}>{sharingPreview ? "Vorschau aktiviert. Kein Standort wird geteilt." : "Vorschau ausgeschaltet. Kein Standort wird geteilt."}</p></section>
          <button className={styles.profileLink} onClick={() => { switchMode("day"); navigate("mountain"); }}><Compass size={22} /><span><strong>Mein Tag</strong><small>Deine Route mit Avatar nachfahren</small></span><ChevronRight size={19} /></button>
          <button className={styles.profileLink} onClick={() => setOverlay("offline")}><ArrowDownToLine size={22} /><span><strong>Offlinekarten</strong><small>Vor dem Funkloch vorbereiten</small></span><ChevronRight size={19} /></button>
        </div>}
      </main>

      <nav className={styles.navigation} aria-label="Hauptnavigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => navigate(id)}><span><Icon size={22} strokeWidth={tab === id ? 2.4 : 1.7} aria-hidden="true" /></span>{label}</button>)}</nav>

      {overlay === "go" && <GoPlanner onClose={() => setOverlay(null)} onComplete={(draft) => { setPlans((current) => [draft, ...current]); navigate("today"); }} />}
      {overlay === "cams" && <Sheet title="Ein Blick auf den Berg." subtitle="Webcams direkt beim Betreiber" onClose={() => setOverlay(null)}><div className={styles.sheetContent}><p>Check Sicht und Schnee, bevor du losfährst. Bildzeit und Kamerastandort stehen beim Betreiber.</p><a className={styles.cameraLink} href="https://nordkette.com/en/cams/" target="_blank" rel="noopener noreferrer"><Camera size={24} /><span><strong>Nordkette · Webcams</strong><small>Hungerburg, Seegrube & Hafelekar</small></span><ArrowRight size={19} /></a><a className={styles.cameraLink} href="https://www.stubaier-gletscher.com/stubai-live/webcams/" target="_blank" rel="noopener noreferrer"><Camera size={24} /><span><strong>Stubai · Webcams</strong><small>Offizielle Kameras & Player</small></span><ArrowRight size={19} /></a><p className={styles.footnote}>Öffnet eine externe Betreiberseite. Eine Webcam zeigt keinen verlässlichen Pisten-Betriebsstatus.</p></div></Sheet>}
      {overlay === "offline" && <Sheet title="Vor dem Funkloch." subtitle="Offline-Gebiet · Konzeptvorschau" onClose={() => setOverlay(null)}><div className={styles.sheetContent}><div className={styles.offlineIcon}><ArrowDownToLine size={33} /></div><h3>Dein Berg. Auch ohne Netz.</h3><p>Geplant: Karte, Pisten, Lifte und dein Treffpunkt als geprüftes Gebietspaket. Downloadgröße, Fortschritt und Datenstand werden hier sichtbar.</p><div className={styles.offlineState}><Mountain size={21} /><span><strong>Nordkette</strong><small>Gebietspaket in Vorbereitung</small></span></div><p className={styles.footnote}>Noch kein Download. Kartenrechte und Paketprüfung sind offen. Freundepositionen und Betriebsstatus werden offline nicht als aktuell angezeigt.</p></div></Sheet>}
      {overlay === "meet" && <Sheet title="Wir sehen uns oben." subtitle="Treffpunkt · Beispielplan" onClose={() => setOverlay(null)}><div className={styles.sheetContent}><div className={styles.meetingSummary}><Flag size={26} /><div><h3>{meetingTarget.name}</h3><p>{meetingTarget.time} Uhr · {meetingTarget.resort}</p></div></div><div className={styles.crewStrip}><div className={styles.avatarStack}><Avatar name="Mia" /><Avatar name="Ben" tone="peach" /></div><div><strong>Mia & Ben</strong><p>Beispiel-Zusagen</p></div></div><button className={styles.primary} onClick={() => setRsvp((value) => !value)}>{rsvp ? <><Check size={18} />Du wärst dabei</> : "Bin dabei · Vorschau"}</button><p className={styles.footnote}>Nur Vorschau. Keine Zusage versendet, keine Ankunftszeit aus Standorten berechnet.</p><button className={styles.secondary} onClick={() => setOverlay("go")}>Eigenen Treffpunkt planen<ArrowRight size={18} /></button></div></Sheet>}
    </div>
  );
}
