"use client";

import { useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useScrollLock } from "@/hooks/useScrollLock";
import { AbilityLevel, City } from "@/lib/types";
import { RESORT_STATUS } from "@/lib/data";
import Icon from "@/components/ui/Icon";

interface PostRideModalProps {
  city: City;
  onClose: () => void;
  onPost: (data: PostData) => void;
}

interface PostData {
  resort: string;
  abilityLevel: AbilityLevel;
  meetTime: string;
  meetPoint: string;
  totalSpots: number;
  caption: string;
}

const ABILITY_OPTIONS: { value: AbilityLevel; label: string; desc: string }[] = [
  { value: "chill", label: "Chill", desc: "Blaue Pisten, entspanntes Tempo" },
  { value: "park", label: "Park", desc: "Kicker, Sprünge, Rails" },
  { value: "off-piste", label: "Off-Piste", desc: "Powder, Gelände, technisch" },
];

export default function PostRideModal({ city, onClose, onPost }: PostRideModalProps) {
  useScrollLock();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const [step, setStep] = useState<1 | 2>(1);
  const [resort, setResort] = useState("");
  const [abilityLevel, setAbilityLevel] = useState<AbilityLevel>("chill");
  const [meetTime, setMeetTime] = useState("09:00");
  const [meetPoint, setMeetPoint] = useState("");
  const [totalSpots, setTotalSpots] = useState(4);
  const [caption, setCaption] = useState("");

  const resorts = RESORT_STATUS.filter((r) => r.city === city).map((r) => r.name);

  const handleSubmit = () => {
    onPost({ resort, abilityLevel, meetTime, meetPoint, totalSpots, caption });
    onClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" role="dialog" aria-modal aria-label="Ausfahrt posten" tabIndex={-1}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: "var(--border-subtle)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="text-sm font-semibold" style={{ color: "var(--sky)" }}>
              Zurück
            </button>
          ) : (
            <button onClick={onClose} className="text-sm font-semibold" style={{ color: "var(--sky)" }}>
              Abbrechen
            </button>
          )}
          <span className="font-bold text-[0.9375rem]" style={{ color: "var(--text-primary)" }}>Ausfahrt posten</span>
          {step === 1 ? (
            <button
              onClick={() => resort && setStep(2)}
              disabled={!resort}
              className="text-sm font-semibold"
              style={{ color: resort ? "var(--sky)" : "var(--text-disabled)" }}
            >
              Weiter
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!meetPoint}
              className="text-sm font-bold"
              style={{ color: meetPoint ? "var(--sky)" : "var(--text-disabled)" }}
            >
              Veröffentlichen
            </button>
          )}
        </div>

        {/* Step 1: Resort + Ability */}
        {step === 1 && (
          <div className="px-5 pt-5 pb-6 space-y-5">
            <div>
              <label htmlFor="post-ride-resort" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Skigebiet
              </label>
              <select
                id="post-ride-resort"
                value={resort}
                onChange={(e) => setResort(e.target.value)}
                className="form-input"
              >
                <option value="">Gebiet wählen …</option>
                {resorts.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <p id="post-ride-level-label" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Fahrstil
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="post-ride-level-label">
                {ABILITY_OPTIONS.map((opt) => {
                  const active = abilityLevel === opt.value;
                  const accent = opt.value === "chill" ? "var(--sky)" : opt.value === "park" ? "var(--rust)" : "#FF9C9C";
                  const bg = opt.value === "chill" ? "var(--accent-primary-subtle)" : opt.value === "park" ? "var(--accent-warm-subtle)" : "rgba(255,107,107,0.14)";
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAbilityLevel(opt.value)}
                      aria-pressed={active}
                      className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all duration-150"
                      style={{ borderColor: active ? accent : "var(--border-subtle)", background: active ? bg : "var(--bg-surface-2)" }}
                    >
                      <span className="text-sm font-bold" style={{ color: active ? accent : "var(--text-primary)" }}>{opt.label}</span>
                      <span className="text-[0.65rem] text-center leading-tight" style={{ color: "var(--text-tertiary)" }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Time, meet point, spots, caption */}
        {step === 2 && (
          <div className="px-5 pt-5 pb-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="post-ride-time" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Uhrzeit
                </label>
                <input
                  id="post-ride-time"
                  type="time"
                  value={meetTime}
                  onChange={(e) => setMeetTime(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="w-24">
                <label htmlFor="post-ride-spots" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Plätze
                </label>
                <select
                  id="post-ride-spots"
                  value={totalSpots}
                  onChange={(e) => setTotalSpots(Number(e.target.value))}
                  className="form-input"
                >
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="post-ride-meeting-point" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Treffpunkt
              </label>
              <input
                id="post-ride-meeting-point"
                type="text"
                placeholder="z. B. Talstation oder Parkplatz"
                value={meetPoint}
                onChange={(e) => setMeetPoint(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="post-ride-caption" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Notiz (optional)
              </label>
              <textarea
                id="post-ride-caption"
                placeholder="Was ist der Plan?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="form-input resize-none"
              />
            </div>

            {/* Summary pill */}
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--accent-primary-subtle)" }}>
              <Icon name="mountain" size={16} color="var(--sky)" strokeWidth={2} />
              <div>
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{resort}</span>
                <span className="text-xs ml-2 font-mono" style={{ color: "var(--sky)" }}>{meetTime} · {totalSpots} Plätze</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
