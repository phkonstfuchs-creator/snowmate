"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ResortScene from "@/components/ResortScene";
import PenguinMascot from "@/components/PenguinMascot";
import Icon from "@/components/ui/Icon";

const D       = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER  = "var(--border-subtle)";
const MUTED   = "var(--text-tertiary)";
const INK     = "var(--text-primary)";
const BRAND   = "var(--accent-primary)";

type City  = "innsbruck" | "salzburg";
type Style = "chill" | "park" | "off-piste";

const STYLE_OPTIONS: { id: Style; label: string; desc: string; color: string; bg: string }[] = [
  { id: "chill",     label: "Chill",      desc: "Groomed runs, sun, good vibes",     color: "var(--ice-400)",   bg: "var(--accent-primary-subtle)" },
  { id: "park",      label: "Park",        desc: "Kickers, rails, creativity",        color: "var(--ember-400)", bg: "var(--accent-warm-subtle)" },
  { id: "off-piste", label: "Off-Piste",  desc: "Powder, backcountry, pure freedom", color: "#FF9C9C",          bg: "rgba(255,107,107,0.14)" },
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 px-6 pt-5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-300"
          style={{ height: 3, background: i < step ? BRAND : "var(--border-subtle)" }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]   = useState(0);
  const [city, setCity]   = useState<City | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [name, setName]   = useState("");
  const [handle, setHandle] = useState("");

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sm_done", "1");
    }
    router.replace("/feed");
  };

  // ── Step 0: Welcome ─────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: D, zIndex: 800, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430 }}>
        {/* Mountain background */}
        <div className="absolute inset-0">
          <ResortScene name="Snowmate" className="w-full h-full" style={{ opacity: 0.85 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(10,14,18,0.72) 55%, var(--bg-canvas) 80%)" }} />
        </div>

        <div className="relative flex-1 flex flex-col px-6">
          {/* Top brand mark */}
          <div className="flex items-center gap-2 pt-12">
            <PenguinMascot size={28} />
            <span className="font-black text-base tracking-tight" style={{ color: "white" }}>Snowmate</span>
          </div>

          {/* Hero content */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-6">
              <h1 className="font-display leading-[0.95] text-white mb-3" style={{ fontSize: "clamp(2.6rem, 12vw, 3.6rem)", fontWeight: 800, letterSpacing: "var(--tracking-display)" }}>
                Find your<br />crew. Today.
              </h1>
              <p className="font-semibold" style={{ color: "var(--text-secondary)", fontSize: "1.0625rem" }}>
                The social network for skiers in Innsbruck and Salzburg.
              </p>
            </div>

            {/* Value props */}
            <div className="space-y-2.5 mb-8">
              {[
                { icon: "mountain-snow", text: "Who's riding where today — live in the feed" },
                { icon: "car", text: "Carpool board for open seats" },
                { icon: "users", text: "Your crew, private & safe" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-primary-subtle)" }}>
                    <Icon name={icon} size={16} color={BRAND} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="pb-10 space-y-3">
            <button
              onClick={next}
              className="w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform"
              style={{ background: BRAND, color: D }}
            >
              Get started
            </button>
            <button
              onClick={finish}
              className="w-full py-3 text-sm font-bold"
              style={{ color: MUTED }}
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: City ────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: D, zIndex: 800, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430 }}>
        <ProgressBar step={1} total={3} />

        <div className="flex items-center gap-3 px-6 pt-4 pb-2">
          <button onClick={back} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SURFACE }}>
            <Icon name="chevron-left" size={18} color={MUTED} />
          </button>
          <div>
            <h2 className="font-display" style={{ color: INK, fontSize: 26, fontWeight: 800 }}>Where do you ride?</h2>
            <p className="text-sm font-medium" style={{ color: MUTED }}>Your region in the feed &amp; on the map</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 gap-4">
          {(["innsbruck", "salzburg"] as City[]).map((c) => {
            const selected = city === c;
            const label = c === "innsbruck" ? "Innsbruck" : "Salzburg";
            const subtitle = c === "innsbruck" ? "Nordkette, Stubai, Axamer & Co." : "Zell am See, Saalbach, Gastein & Co.";
            return (
              <button
                key={c}
                onClick={() => { setCity(c); setTimeout(() => setStep(2), 200); }}
                className="relative rounded-3xl overflow-hidden text-left active:scale-98 transition-transform"
                style={{
                  height: 140,
                  border: `2px solid ${selected ? BRAND : BORDER}`,
                  boxShadow: selected ? `0 0 0 2px rgba(79,195,240,0.27)` : "none",
                }}
              >
                <ResortScene name={c === "innsbruck" ? "Nordkette" : "Zell am See"} className="absolute inset-0 w-full h-full" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)" }} />
                {selected && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: BRAND }}>
                    <Icon name="check" size={14} color={D} strokeWidth={2.4} />
                  </div>
                )}
                <div className="absolute bottom-4 left-4">
                  <p className="font-display text-white" style={{ fontSize: 22, fontWeight: 800 }}>{label}</p>
                  <p className="text-white/65 text-xs font-semibold mt-0.5">{subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pb-10 px-6">
          <p className="text-center text-xs font-medium" style={{ color: MUTED }}>You can change your region later</p>
        </div>
      </div>
    );
  }

  // ── Step 2: Style ────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: D, zIndex: 800, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430 }}>
        <ProgressBar step={2} total={3} />

        <div className="flex items-center gap-3 px-6 pt-4 pb-2">
          <button onClick={back} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SURFACE }}>
            <Icon name="chevron-left" size={18} color={MUTED} />
          </button>
          <div>
            <h2 className="font-display" style={{ color: INK, fontSize: 26, fontWeight: 800 }}>How do you ride?</h2>
            <p className="text-sm font-medium" style={{ color: MUTED }}>Shapes your feed &amp; your crew</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 gap-3">
          {STYLE_OPTIONS.map((opt) => {
            const selected = style === opt.id;
            const iconName = opt.id === "chill" ? "sun" : opt.id === "park" ? "zap" : "mountain-snow";
            return (
              <button
                key={opt.id}
                onClick={() => { setStyle(opt.id); setTimeout(() => setStep(3), 200); }}
                className="flex items-center gap-4 p-4 rounded-2xl text-left active:scale-98 transition-transform"
                style={{
                  background: selected ? opt.bg : SURFACE,
                  border: `2px solid ${selected ? opt.color : BORDER}`,
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: opt.bg }}>
                  <Icon name={iconName} size={26} color={opt.color} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display" style={{ color: selected ? opt.color : INK, fontSize: 19, fontWeight: 700 }}>{opt.label}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: MUTED }}>{opt.desc}</p>
                </div>
                {selected && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: opt.color }}>
                    <Icon name="check" size={13} color={D} strokeWidth={2.4} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="pb-10 px-6">
          <button onClick={() => setStep(3)} className="w-full py-3 text-sm font-bold" style={{ color: MUTED }}>Skip</button>
        </div>
      </div>
    );
  }

  // ── Step 3: Profile setup ─────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: D, zIndex: 800, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430 }}>
      <ProgressBar step={3} total={3} />

      <div className="flex items-center gap-3 px-6 pt-4 pb-2">
        <button onClick={back} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SURFACE }}>
          <Icon name="chevron-left" size={18} color={MUTED} />
        </button>
        <div>
          <h2 className="font-display" style={{ color: INK, fontSize: 26, fontWeight: 800 }}>What's your name?</h2>
          <p className="text-sm font-medium" style={{ color: MUTED }}>Visible to confirmed crew members</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        {/* Avatar preview */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: BRAND }}>
            <span className="font-display text-2xl" style={{ color: "var(--text-on-accent)", fontWeight: 800 }}>{name ? name[0].toUpperCase() : "?"}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Name</p>
            <input
              className="form-input"
              placeholder="Alex Rider"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                setHandle(v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20));
              }}
            />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Handle</p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold" style={{ color: MUTED }}>@</span>
              <input
                className="form-input"
                style={{ paddingLeft: "1.8rem" }}
                placeholder="alex_rider"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
              />
            </div>
          </div>
        </div>

        {/* Selections summary */}
        <div className="flex gap-2 mt-6">
          {city && (
            <span className="text-xs font-black px-3 py-1.5 rounded-full" style={{ background: "var(--accent-primary-subtle)", color: BRAND }}>
              {city === "innsbruck" ? "Innsbruck" : "Salzburg"}
            </span>
          )}
          {style && (
            <span className="text-xs font-black px-3 py-1.5 rounded-full" style={{
              background: style === "chill" ? "var(--accent-primary-subtle)" : style === "park" ? "var(--accent-warm-subtle)" : "rgba(255,107,107,0.14)",
              color: style === "chill" ? "var(--ice-400)" : style === "park" ? "var(--ember-400)" : "#FF9C9C",
            }}>
              {style === "chill" ? "Chill" : style === "park" ? "Park" : "Off-Piste"}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-10 space-y-3">
        <button
          onClick={finish}
          disabled={!name.trim()}
          className="w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform disabled:opacity-40"
          style={{ background: BRAND, color: D }}
        >
          Let&apos;s go
        </button>
        <p className="text-center text-[0.65rem] font-medium" style={{ color: MUTED }}>
          By creating an account you agree to our Terms of Service. Under 18? Parental consent required.
        </p>
      </div>
    </div>
  );
}
