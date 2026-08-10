"use client";

import { useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import { AbilityLevel, City, RideVisibility } from "@/lib/types";
import { RESORT_STATUS, ME } from "@/lib/data";
import { canPostPublicRide } from "@/features/rides/visibility";
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
  visibility: RideVisibility;
}

const ABILITY_OPTIONS: { value: AbilityLevel; label: string; desc: string }[] = [
  { value: "chill", label: "Chill", desc: "Blue runs, relaxed pace" },
  { value: "park", label: "Park", desc: "Kickers, jumps, rails" },
  { value: "off-piste", label: "Off-piste", desc: "Powder, terrain, technical" },
];

export default function PostRideModal({ city, onClose, onPost }: PostRideModalProps) {
  useScrollLock();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [step, setStep] = useState<1 | 2>(1);
  const [resort, setResort] = useState("");
  const [abilityLevel, setAbilityLevel] = useState<AbilityLevel>("chill");
  const [meetTime, setMeetTime] = useState("09:00");
  const [meetPoint, setMeetPoint] = useState("");
  const [totalSpots, setTotalSpots] = useState(4);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<RideVisibility>("friends");

  const resorts = RESORT_STATUS.filter((r) => r.city === city).map((r) => r.name);
  /* Minors cannot post publicly. The toggle is disabled rather than
     hidden — an absent control reads as a bug, a locked one reads as
     a rule. */
  const mayGoPublic = canPostPublicRide(ME);

  const handleSubmit = () => {
    onPost({
      resort,
      abilityLevel,
      meetTime,
      meetPoint,
      totalSpots,
      caption,
      visibility: mayGoPublic ? visibility : "friends",
    });
    dismiss();
  };

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal aria-label="Post a ride" tabIndex={-1}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: "var(--border-subtle)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="text-sm font-semibold" style={{ color: "var(--sky)" }}>
              Back
            </button>
          ) : (
            <button onClick={dismiss} className="text-sm font-semibold" style={{ color: "var(--sky)" }}>
              Cancel
            </button>
          )}
          <span className="font-bold text-[0.9375rem]" style={{ color: "var(--text-primary)" }}>Post a ride</span>
          {step === 1 ? (
            <button
              onClick={() => resort && setStep(2)}
              disabled={!resort}
              className="text-sm font-semibold"
              style={{ color: resort ? "var(--sky)" : "var(--text-disabled)" }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!meetPoint}
              className="text-sm font-bold"
              style={{ color: meetPoint ? "var(--sky)" : "var(--text-disabled)" }}
            >
              Publish
            </button>
          )}
        </div>

        {/* Step 1: Resort + Ability */}
        {step === 1 && (
          <div className="px-5 pt-5 pb-6 space-y-5">
            <div>
              <label htmlFor="post-ride-resort" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Resort
              </label>
              <select
                id="post-ride-resort"
                value={resort}
                onChange={(e) => setResort(e.target.value)}
                className="form-input"
              >
                <option value="">Choose a resort …</option>
                {resorts.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <p id="post-ride-level-label" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Riding style
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="post-ride-level-label">
                {ABILITY_OPTIONS.map((opt) => {
                  const active = abilityLevel === opt.value;
                  const accent = opt.value === "chill" ? "var(--rust-ink)" : opt.value === "park" ? "var(--sky-ink)" : "var(--pine)";
                  const bg = opt.value === "chill" ? "var(--accent-warm-subtle)" : opt.value === "park" ? "rgba(62, 110, 142, 0.16)" : "rgba(42, 86, 71, 0.16)";
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAbilityLevel(opt.value)}
                      aria-pressed={active}
                      className="flex flex-col items-center gap-1 px-3 py-3 border-2 transition-colors duration-100"
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
                  Time
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
                  Spots
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
                Meeting point
              </label>
              <input
                id="post-ride-meeting-point"
                type="text"
                placeholder="e.g. base station or car park"
                value={meetPoint}
                onChange={(e) => setMeetPoint(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="post-ride-caption" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Note (optional)
              </label>
              <textarea
                id="post-ride-caption"
                placeholder="What is the plan?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="form-input resize-none"
              />
            </div>

            <div>
              <p id="post-ride-visibility-label" className="block text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Who can see this
              </p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="post-ride-visibility-label">
                {([
                  { value: "friends", label: "Friends", desc: "Friends and their friends" },
                  { value: "public", label: "Public", desc: "Anyone, no friendship needed" },
                ] as const).map((opt) => {
                  const active = visibility === opt.value;
                  const locked = opt.value === "public" && !mayGoPublic;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !locked && setVisibility(opt.value)}
                      aria-pressed={active}
                      disabled={locked}
                      className="flex flex-col items-start gap-1 px-3 py-3 border-2 text-left transition-colors duration-100"
                      style={{
                        borderColor: active ? "var(--rust)" : "var(--border-subtle)",
                        background: active ? "var(--accent-warm-subtle)" : "var(--bg-surface-2)",
                        opacity: locked ? 0.55 : 1,
                        cursor: locked ? "not-allowed" : "pointer",
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon
                          name={opt.value === "public" ? "globe" : "users"}
                          size={13}
                          color={active ? "var(--rust)" : "var(--text-tertiary)"}
                          strokeWidth={2}
                        />
                        <span className="text-sm font-bold" style={{ color: active ? "var(--rust)" : "var(--text-primary)" }}>
                          {opt.label}
                        </span>
                        {locked && <Icon name="lock" size={11} color="var(--text-tertiary)" strokeWidth={2} />}
                      </span>
                      <span className="text-[0.65rem] leading-tight" style={{ color: "var(--text-tertiary)" }}>
                        {locked ? "18 and over only" : opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
              {visibility === "public" && mayGoPublic && (
                <p className="text-[0.7rem] leading-snug mt-2" style={{ color: "var(--text-tertiary)" }}>
                  Everyone sees the resort and time. The exact meeting point
                  only becomes visible after someone joins.
                </p>
              )}
            </div>

            {/* Summary pill */}
            <div className="rounded-none px-4 py-3 flex items-center gap-3" style={{ background: "var(--accent-primary-subtle)" }}>
              <Icon name="mountain" size={16} color="var(--sky)" strokeWidth={2} />
              <div>
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{resort}</span>
                <span className="text-xs ml-2 font-mono" style={{ color: "var(--sky)" }}>{meetTime} · {totalSpots} spots</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
