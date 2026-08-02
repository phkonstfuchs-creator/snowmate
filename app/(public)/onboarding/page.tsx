"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ResortScene from "@/components/ResortScene";
import PenguinMascot from "@/components/PenguinMascot";
import Icon from "@/components/ui/Icon";
import type { AbilityLevel, City } from "@/lib/types";

const PAPER = "var(--paper-0)";
const PAPER_1 = "var(--paper-1)";
const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PINE = "var(--pine)";
const OCHRE = "var(--ochre)";

type Style = AbilityLevel;

const STYLE_OPTIONS: { id: Style; label: string; desc: string; color: string }[] = [
  { id: "chill", label: "Chill", desc: "Präparierte Hänge, Sonne, gute Laune", color: PINE },
  { id: "park", label: "Park", desc: "Kicker, Rails, Kreativität", color: OCHRE },
  { id: "off-piste", label: "Off-Piste", desc: "Powder, Backcountry, volle Freiheit", color: RUST },
];

const CITIES: { id: City; label: string; sub: string; scene: string }[] = [
  { id: "innsbruck", label: "Innsbruck", sub: "Nordkette, Stubai, Axamer & Co.", scene: "Nordkette" },
  { id: "salzburg", label: "Salzburg", sub: "Zell am See, Saalbach, Gastein & Co.", scene: "Zell am See" },
];

/* Schrittanzeige als gedruckte Laufnummer, nicht als Fortschrittspille */
function StepMark({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="flex items-center gap-2 px-4 pt-5 pb-3"
      role="progressbar"
      aria-label="Fortschritt der Einrichtung"
      aria-valuenow={step}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuetext={`Schritt ${step} von ${total}`}
    >
      <span className="text-mono-label" style={{ color: RUST }}>
        {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
      <div aria-hidden="true" className="flex flex-1 gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ height: 4, background: i < step ? INK : "var(--paper-3)" }}
          />
        ))}
      </div>
    </div>
  );
}

function StepHeader({
  onBack,
  title,
  sub,
  headingRef,
}: {
  onBack: () => void;
  title: string;
  sub: string;
  headingRef: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="px-4 pb-4" style={{ borderBottom: "var(--rule-thin)" }}>
      <button
        onClick={onBack}
        aria-label="Zurück"
        className="-ml-2 mb-2 flex h-11 w-11 items-center justify-center"
      >
        <Icon name="chevron-left" size={20} color={INK} strokeWidth={2} />
      </button>
      <h2 ref={headingRef} tabIndex={-1} className="text-display-md outline-none" style={{ color: INK }}>
        {title}
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: INK_2 }}>{sub}</p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState<City | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "sm_onboarding_draft",
        JSON.stringify({ city, style, displayName: name.trim(), handle }),
      );
    }
    router.push("/signup");
  };

  const shell =
    "fixed inset-0 flex flex-col overflow-y-auto overscroll-contain paper-grain";
  const shellStyle: React.CSSProperties = {
    background: PAPER,
    zIndex: 800,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
  };

  // ── Schritt 0: Titelseite ────────────────────────────────────
  if (step === 0) {
    return (
      <div className={shell} style={shellStyle}>
        {/* Bergszene als oberes Drittel, hart abgeschnitten */}
        <div className="relative" style={{ height: "38%", borderBottom: "var(--rule-heavy)" }}>
          <ResortScene name="Snowmate" className="h-full w-full" />
          <div className="absolute left-4 top-5 flex items-center gap-2">
            <PenguinMascot size={26} />
            <span className="text-mono-label" style={{ color: INK }}>Snowmate</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 pt-6">
          <p className="text-mono-label" style={{ color: RUST }}>Saison 25/26 · Tirol &amp; Salzburg</p>
          {/* Leerzeichen vor jedem Umbruch, sonst liest der Screenreader
              "FindedeineCrew" als ein Wort */}
          <h1 className="text-display-hero mt-3" style={{ color: INK }}>
            Finde{" "}
            <br />
            deine{" "}
            <br />
            Crew
          </h1>

          <div className="mt-6" style={{ borderTop: "var(--rule-thin)" }}>
            {[
              ["01", "Wer heute wo fährt — live im Feed"],
              ["02", "Mitfahrbörse für freie Plätze"],
              ["03", "Deine Crew, privat und sicher"],
            ].map(([num, text]) => (
              <div
                key={num}
                className="flex items-baseline gap-3 py-2.5"
                style={{ borderBottom: "1px solid var(--border-hairline)" }}
              >
                <span className="text-mono-label" style={{ color: RUST }}>{num}</span>
                <span className="text-sm" style={{ color: INK }}>{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pb-8 pt-6">
            <button
              onClick={next}
              className="card-tap w-full py-4 font-display text-xl uppercase"
              style={{
                background: RUST,
                color: PAPER,
                border: "var(--rule-thick)",
                boxShadow: "var(--shadow-print)",
                letterSpacing: 0,
              }}
            >
              Los geht&rsquo;s
            </button>
            <button
              onClick={() => router.push("/login")}
              className="mt-3 w-full py-3 text-sm font-semibold underline"
              style={{ color: INK_2 }}
            >
              Ich habe schon einen Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Schritt 1: Region ────────────────────────────────────────
  if (step === 1) {
    return (
      <div className={shell} style={shellStyle}>
        <StepMark step={1} total={3} />
        <StepHeader
          onBack={back}
          title="Wo fährst du?"
          sub="Bestimmt deine Region im Feed und auf der Karte"
          headingRef={headingRef}
        />

        <div className="flex flex-1 flex-col justify-center gap-4 px-4">
          {CITIES.map(({ id, label, sub, scene }) => {
            const selected = city === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setCity(id);
                  setTimeout(() => setStep(2), 180);
                }}
                aria-pressed={selected}
                aria-label={`${label} — ${sub}`}
                className="card-tap relative overflow-hidden text-left"
                style={{
                  height: 148,
                  border: "var(--rule-thick)",
                  boxShadow: selected ? "none" : "var(--shadow-print)",
                  transform: selected ? "translate(3px, 3px)" : "none",
                }}
              >
                <ResortScene name={scene} className="absolute inset-0 h-full w-full" />
                <div
                  className="absolute inset-x-0 bottom-0 px-3 py-2"
                  style={{ background: PAPER, borderTop: "var(--rule-thick)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-xl uppercase leading-none" style={{ color: INK, letterSpacing: 0 }}>
                      {label}
                    </p>
                    {selected && <Icon name="check" size={18} color={RUST} strokeWidth={2.6} />}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: INK_2 }}>{sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="px-4 pb-8 text-center text-mono-label" style={{ color: INK_2 }}>
          Später jederzeit änderbar
        </p>
      </div>
    );
  }

  // ── Schritt 2: Fahrstil ──────────────────────────────────────
  if (step === 2) {
    return (
      <div className={shell} style={shellStyle}>
        <StepMark step={2} total={3} />
        <StepHeader
          onBack={back}
          title="Wie fährst du?"
          sub="Prägt deinen Feed und deine Crew"
          headingRef={headingRef}
        />

        <div className="flex flex-1 flex-col justify-center gap-3 px-4">
          {STYLE_OPTIONS.map((opt) => {
            const selected = style === opt.id;
            const iconName =
              opt.id === "chill" ? "sun" : opt.id === "park" ? "zap" : "mountain-snow";
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setStyle(opt.id);
                  setTimeout(() => setStep(3), 180);
                }}
                aria-pressed={selected}
                className="card-tap flex items-center gap-4 px-4 py-4 text-left"
                style={{
                  background: selected ? opt.color : PAPER_1,
                  border: "var(--rule-thick)",
                  boxShadow: selected ? "none" : "var(--shadow-print)",
                  transform: selected ? "translate(3px, 3px)" : "none",
                }}
              >
                <Icon
                  name={iconName}
                  size={28}
                  color={selected ? (opt.id === "park" ? INK : PAPER) : opt.color}
                  strokeWidth={1.9}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="font-display text-xl uppercase leading-none"
                    style={{
                      color: selected ? (opt.id === "park" ? INK : PAPER) : INK,
                      letterSpacing: 0,
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: selected ? (opt.id === "park" ? INK : PAPER) : INK_2 }}
                  >
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-8">
          <button
            onClick={() => setStep(3)}
            className="w-full py-3 text-sm font-semibold underline"
            style={{ color: INK_2 }}
          >
            Überspringen
          </button>
        </div>
      </div>
    );
  }

  // ── Schritt 3: Name ──────────────────────────────────────────
  return (
    <div className={shell} style={shellStyle}>
      <StepMark step={3} total={3} />
      <StepHeader
        onBack={back}
        title="Wie heißt du?"
        sub="Sichtbar für bestätigte Crew-Mitglieder"
        headingRef={headingRef}
      />

      <div className="flex flex-1 flex-col justify-center px-4">
        {/* Namenszug als Stempelvorschau */}
        <div className="mb-6 flex justify-center" aria-hidden="true">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 92,
              height: 92,
              border: `2px solid ${RUST}`,
              boxShadow: `inset 0 0 0 4px ${PAPER}, inset 0 0 0 5px ${RUST}`,
              transform: "rotate(-6deg)",
            }}
          >
            <span className="font-display text-3xl" style={{ color: RUST }}>
              {name ? name.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="onboarding-name" className="text-mono-label mb-1.5 block" style={{ color: INK }}>
              Name
            </label>
            <input
              id="onboarding-name"
              className="form-input"
              placeholder="Alex Rider"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                setHandle(
                  v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20),
                );
              }}
            />
          </div>
          <div>
            <label htmlFor="onboarding-handle" className="text-mono-label mb-1.5 block" style={{ color: INK }}>
              Handle
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: INK_2, fontFamily: "var(--font-mono-stack)" }}
              >
                @
              </span>
              <input
                id="onboarding-handle"
                className="form-input"
                style={{ paddingLeft: "2rem", fontFamily: "var(--font-mono-stack)" }}
                placeholder="alex_rider"
                autoComplete="off"
                value={handle}
                onChange={(e) =>
                  setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))
                }
              />
            </div>
          </div>
        </div>

        {(city || style) && (
          <div className="mt-6 flex gap-2">
            {city && (
              <span className="text-mono-label px-2.5 py-1" style={{ border: "var(--rule-thin)", color: INK }}>
                {CITIES.find((c) => c.id === city)?.label}
              </span>
            )}
            {style && (
              <span className="text-mono-label px-2.5 py-1" style={{ border: "var(--rule-thin)", color: INK }}>
                {STYLE_OPTIONS.find((s) => s.id === style)?.label}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-8">
        <button
          onClick={finish}
          disabled={!name.trim()}
          className="card-tap w-full py-4 font-display text-xl uppercase disabled:opacity-40"
          style={{
            background: RUST,
            color: PAPER,
            border: "var(--rule-thick)",
            boxShadow: "var(--shadow-print)",
            letterSpacing: 0,
          }}
        >
          Account erstellen
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed" style={{ color: INK_2 }}>
          Mit dem Erstellen akzeptierst du unsere Nutzungsbedingungen.
          Unter 18? Dann brauchst du die Zustimmung deiner Eltern.
        </p>
      </div>
    </div>
  );
}
