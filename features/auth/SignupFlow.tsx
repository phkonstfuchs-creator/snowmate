"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PrivacyConsent } from "@/features/legal/LegalLinks";
import { useRouter } from "next/navigation";
import ResortScene from "@/components/ResortScene";
import PenguinMascot from "@/components/PenguinMascot";
import Icon from "@/components/ui/Icon";
import Input from "@/components/ui/Input";
import type { AbilityLevel, City } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { checkHandleAction, signUpAction } from "./actions";
import { initialAuthActionState, type AuthActionState, type HandleCheck } from "./action-state";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

const PAPER = "var(--paper-0)";
const PAPER_1 = "var(--paper-1)";
const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PINE = "var(--pine)";
const OCHRE = "var(--ochre)";

const STYLE_OPTIONS: { id: AbilityLevel; label: MessageKey; desc: MessageKey; color: string; icon: string }[] = [
  { id: "chill", label: "common.chill", desc: "onb.chillDesc", color: PINE, icon: "sun" },
  { id: "park", label: "common.park", desc: "onb.parkDesc", color: OCHRE, icon: "zap" },
  { id: "off-piste", label: "common.offPiste", desc: "onb.offPisteDesc", color: RUST, icon: "mountain-snow" },
];

const CITIES: { id: City; label: string; sub: MessageKey; scene: string }[] = [
  { id: "innsbruck", label: "Innsbruck", sub: "onb.innsbruckSub", scene: "Nordkette" },
  { id: "salzburg", label: "Salzburg", sub: "onb.salzburgSub", scene: "Zell am See" },
];

const TOTAL_STEPS = 4;
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

function StepMark({ step }: { step: number }) {
  const t = useT();
  return (
    <div
      className="flex items-center gap-2 px-4 pt-5 pb-3"
      role="progressbar"
      aria-label={t("onb.progress")}
      aria-valuenow={step}
      aria-valuemin={0}
      aria-valuemax={TOTAL_STEPS}
      aria-valuetext={t("onb.stepOf", { step, total: TOTAL_STEPS })}
    >
      <span className="text-mono-label" style={{ color: RUST }}>
        {String(step).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
      </span>
      <div aria-hidden="true" className="flex flex-1 gap-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className="flex-1" style={{ height: 4, background: i < step ? INK : "var(--paper-3)" }} />
        ))}
      </div>
    </div>
  );
}

function StepHeader({ onBack, title, sub, headingRef }: {
  onBack: () => void;
  title: string;
  sub: string;
  headingRef: React.Ref<HTMLHeadingElement>;
}) {
  const t = useT();
  return (
    <div className="px-4 pb-4" style={{ borderBottom: "var(--rule-thin)" }}>
      <button type="button" onClick={onBack} aria-label={t("common.back")} className="-ml-2 mb-2 flex h-11 w-11 items-center justify-center">
        <Icon name="chevron-left" size={20} color={INK} strokeWidth={2} />
      </button>
      <h2 ref={headingRef} tabIndex={-1} className="text-display-md outline-none" style={{ color: INK }}>{title}</h2>
      <p className="mt-1.5 text-sm" style={{ color: INK_2 }}>{sub}</p>
    </div>
  );
}

function PrimaryButton({ children, disabled, onClick, type = "button" }: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="card-tap w-full py-4 font-display text-xl uppercase disabled:opacity-40"
      style={{ background: RUST, color: PAPER, border: "var(--rule-thick)", boxShadow: "var(--shadow-print)", letterSpacing: 0 }}
    >
      {children}
    </button>
  );
}

/* The whole sign-up: region, styles, name, handle, birth date, then the
   account itself. Everything is sent once, with the account, so the
   profile exists as soon as the account does. `startAtTitle` shows the
   cover page first (/onboarding); /signup jumps straight to the region. */
export default function SignupFlow({ startAtTitle = true }: { startAtTitle?: boolean }) {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState(startAtTitle ? 0 : 1);
  const [city, setCity] = useState<City | null>(null);
  const [styles, setStyles] = useState<AbilityLevel[]>([]);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  /* Result of the last availability check, tied to the handle it was for. */
  const [checked, setChecked] = useState<{ handle: string; result: HandleCheck } | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /* A profile problem found by the server sends the person back to the
     step where it can be fixed. */
  const [state, formAction, pending] = useActionState(
    async (previous: AuthActionState, formData: FormData) => {
      const result = await signUpAction(previous, formData);
      const errors = result.profileErrors;
      if (errors?.city) setStep(1);
      else if (errors?.ridingStyles) setStep(2);
      else if (errors?.displayName || errors?.handle || errors?.birthDate) setStep(3);
      return result;
    },
    initialAuthActionState,
  );

  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const handleStatus: HandleCheck | "checking" | null = !handle
    ? null
    : !HANDLE_RE.test(handle)
      ? "invalid"
      : checked?.handle === handle
        ? checked.result
        : "checking";

  /* Debounced availability check while typing the handle. */
  useEffect(() => {
    if (!HANDLE_RE.test(handle)) return;
    let active = true;
    const timer = setTimeout(() => {
      checkHandleAction(handle)
        .then((result) => active && setChecked({ handle, result }))
        .catch(() => active && setChecked({ handle, result: "unknown" }));
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [handle]);

  const back = () => (step <= 1 && !startAtTitle ? router.push("/") : setStep((s) => Math.max(0, s - 1)));
  const toggleStyle = (id: AbilityLevel) =>
    setStyles((current) => (current.includes(id) ? current.filter((s) => s !== id) : [...current, id]));

  const shell = "fixed inset-0 flex flex-col overflow-y-auto overscroll-contain paper-grain";
  const shellStyle: React.CSSProperties = {
    background: PAPER,
    zIndex: 800,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
  };

  const profileComplete = name.trim().length >= 2 && HANDLE_RE.test(handle) && handleStatus !== "taken" && Boolean(birthDate);

  // ── Step 0: title page ─────────────────────────────────────
  if (step === 0) {
    return (
      <div className={shell} style={shellStyle}>
        <div className="relative" style={{ height: "38%", borderBottom: "var(--rule-heavy)" }}>
          <ResortScene name="Pistl" className="h-full w-full" />
          <div className="absolute left-4 top-5 flex items-center gap-2">
            <PenguinMascot size={26} />
            <span className="text-mono-label" style={{ color: INK }}>Pistl</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 pt-6">
          <p className="text-mono-label" style={{ color: RUST }}>{t("onb.season")}</p>
          <h1 className="text-display-hero mt-3" style={{ color: INK }}>
            {t("onb.heroLine1")}{" "}
            <br />
            {t("onb.heroLine2")}{" "}
            <br />
            {t("onb.heroLine3")}
          </h1>
          <div className="mt-6" style={{ borderTop: "var(--rule-thin)" }}>
            {[["01", t("onb.point1")], ["02", t("onb.point2")], ["03", t("onb.point3")]].map(([num, text]) => (
              <div key={num} className="flex items-baseline gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                <span className="text-mono-label" style={{ color: RUST }}>{num}</span>
                <span className="text-sm" style={{ color: INK }}>{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto pb-8 pt-6">
            <PrimaryButton onClick={() => setStep(1)}>{t("onb.getStarted")}</PrimaryButton>
            <button type="button" onClick={() => router.push("/login")} className="mt-3 w-full py-3 text-sm font-semibold underline" style={{ color: INK_2 }}>
              {t("onb.haveAccount")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: region ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div className={shell} style={shellStyle}>
        <StepMark step={1} />
        <StepHeader onBack={back} title={t("onb.whereTitle")} sub={t("onb.whereSub")} headingRef={headingRef} />
        <div className="flex flex-1 flex-col justify-center gap-4 px-4">
          {CITIES.map(({ id, label, sub, scene }) => {
            const selected = city === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setCity(id);
                  setTimeout(() => setStep(2), 180);
                }}
                aria-pressed={selected}
                aria-label={`${label} — ${t(sub)}`}
                className="card-tap relative overflow-hidden text-left"
                style={{ height: 148, border: "var(--rule-thick)", boxShadow: selected ? "none" : "var(--shadow-print)", transform: selected ? "translate(3px, 3px)" : "none" }}
              >
                <ResortScene name={scene} className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-x-0 bottom-0 px-3 py-2" style={{ background: PAPER, borderTop: "var(--rule-thick)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-xl uppercase leading-none" style={{ color: INK, letterSpacing: 0 }}>{label}</p>
                    {selected && <Icon name="check" size={18} color={RUST} strokeWidth={2.6} />}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: INK_2 }}>{t(sub)}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="px-4 pb-8 text-center text-mono-label" style={{ color: INK_2 }}>{t("onb.changeLater")}</p>
      </div>
    );
  }

  // ── Step 2: riding styles (one or more) ────────────────────
  if (step === 2) {
    return (
      <div className={shell} style={shellStyle}>
        <StepMark step={2} />
        <StepHeader onBack={back} title={t("onb.howTitle")} sub={t("onb.howSubMulti")} headingRef={headingRef} />
        <div className="flex flex-1 flex-col justify-center gap-3 px-4">
          {STYLE_OPTIONS.map((opt) => {
            const selected = styles.includes(opt.id);
            const onColor = opt.id === "park" ? INK : PAPER;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleStyle(opt.id)}
                aria-pressed={selected}
                className="card-tap flex items-center gap-4 px-4 py-4 text-left"
                style={{ background: selected ? opt.color : PAPER_1, border: "var(--rule-thick)", boxShadow: selected ? "none" : "var(--shadow-print)", transform: selected ? "translate(3px, 3px)" : "none" }}
              >
                <Icon name={opt.icon} size={28} color={selected ? onColor : opt.color} strokeWidth={1.9} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl uppercase leading-none" style={{ color: selected ? onColor : INK, letterSpacing: 0 }}>{t(opt.label)}</p>
                  <p className="mt-1 text-sm" style={{ color: selected ? onColor : INK_2 }}>{t(opt.desc)}</p>
                </div>
                {selected && <Icon name="check" size={20} color={onColor} strokeWidth={2.6} />}
              </button>
            );
          })}
          {state.profileErrors?.ridingStyles && (
            <p role="alert" className="text-sm" style={{ color: "var(--crimson)" }}>{state.profileErrors.ridingStyles}</p>
          )}
        </div>
        <div className="px-4 pb-8 pt-4">
          <PrimaryButton disabled={styles.length === 0} onClick={() => setStep(3)}>{t("common.next")}</PrimaryButton>
        </div>
      </div>
    );
  }

  // ── Step 3: name, handle, birth date ───────────────────────
  if (step === 3) {
    const handleHint =
      handleStatus === "taken" ? t("v.handleTaken")
        : handleStatus === "invalid" && handleTouched ? t("v.handleFormat")
          : handleStatus === "available" ? t("onb.handleFree")
            : handleStatus === "checking" ? t("onb.handleChecking")
              : null;
    return (
      <div className={shell} style={shellStyle}>
        <StepMark step={3} />
        <StepHeader onBack={back} title={t("onb.nameTitle")} sub={t("onb.nameSub")} headingRef={headingRef} />
        <div className="flex flex-1 flex-col justify-center px-4 py-4">
          <div className="space-y-4">
            <Input
              label={t("onb.name")}
              placeholder="Alex Rider"
              autoComplete="name"
              maxLength={50}
              value={name}
              error={state.profileErrors?.displayName}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!handleTouched) {
                  setHandle(value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20));
                }
              }}
            />
            <div>
              <label htmlFor="signup-handle" className="text-mono-label mb-1.5 block" style={{ color: INK }}>{t("onb.handle")}</label>
              <div className="relative">
                <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: INK_2, fontFamily: "var(--font-mono-stack)" }}>@</span>
                <input
                  id="signup-handle"
                  className="form-input"
                  style={{ paddingLeft: "2rem", fontFamily: "var(--font-mono-stack)" }}
                  placeholder="alex_rider"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-describedby="signup-handle-hint"
                  value={handle}
                  onChange={(event) => {
                    setHandleTouched(true);
                    setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20));
                  }}
                />
              </div>
              <p id="signup-handle-hint" aria-live="polite" className="mt-1 min-h-4 text-xs"
                style={{ color: handleStatus === "taken" || (handleStatus === "invalid" && handleTouched) || state.profileErrors?.handle ? "var(--crimson)" : handleStatus === "available" ? PINE : INK_2 }}>
                {state.profileErrors?.handle ?? handleHint}
              </p>
            </div>
            <Input
              label={t("profile.birthDate")}
              type="date"
              autoComplete="bday"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              helper={t("onb.birthHint")}
              error={state.profileErrors?.birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
        </div>
        <div className="px-4 pb-8">
          <PrimaryButton disabled={!profileComplete} onClick={() => setStep(4)}>{t("common.next")}</PrimaryButton>
        </div>
      </div>
    );
  }

  // ── Step 4: the account ────────────────────────────────────
  return (
    <div className={shell} style={shellStyle}>
      <StepMark step={4} />
      <StepHeader onBack={back} title={t("onb.accountTitle")} sub={t("onb.accountSub")} headingRef={headingRef} />
      <form action={formAction} className="flex flex-1 flex-col px-4 py-4" noValidate>
        <input type="hidden" name="city" value={city ?? ""} />
        {styles.map((style) => <input key={style} type="hidden" name="ridingStyles" value={style} />)}
        <input type="hidden" name="displayName" value={name} />
        <input type="hidden" name="handle" value={handle} />
        <input type="hidden" name="birthDate" value={birthDate} />

        <div className="space-y-4">
          <Input label={t("auth.email")} name="email" type="email" autoComplete="email" inputMode="email"
            value={email} onChange={(event) => setEmail(event.target.value)}
            error={state.fieldErrors?.email?.[0]} disabled={pending} required />
          <div>
            <Input label={t("auth.password")} name="password" type="password" autoComplete="new-password"
              helper={t("auth.passwordHelper")} value={password} onChange={(event) => setPassword(event.target.value)}
              error={state.fieldErrors?.password?.[0]} disabled={pending} required />
            <PasswordStrengthMeter password={password} email={email} />
          </div>
          <Input label={t("auth.confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password"
            error={state.fieldErrors?.confirmPassword?.[0]} disabled={pending} required />
        </div>

        {state.status === "error" && (
          <p role="alert" className="mt-4 text-sm font-semibold" style={{ color: "var(--crimson)" }}>{state.message}</p>
        )}

        <div className="mt-auto pt-6">
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? t("auth.creating") : t("auth.createAccount")}
          </PrimaryButton>
          <PrivacyConsent className="mt-3 text-center text-xs leading-relaxed" />
        </div>
      </form>
    </div>
  );
}
