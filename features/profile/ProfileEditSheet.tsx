"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Icon from "@/components/ui/Icon";
import { updateProfileAction } from "./actions";
import { initialProfileActionState } from "./action-state";
import {
  ONBOARDING_DRAFT_KEY,
  type OwnProfile,
  type ProfileField,
} from "./profile-input";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";

const CITY_OPTIONS = [
  { id: "innsbruck", label: "Innsbruck" },
  { id: "salzburg", label: "Salzburg" },
] as const;

const ABILITY_OPTIONS = [
  { id: "chill", label: "Chill" },
  { id: "park", label: "Park" },
  { id: "off-piste", label: "Off-piste" },
] as const;

interface DraftValues {
  displayName?: string;
  handle?: string;
  city?: string;
  style?: string;
}

/* An incomplete profile may still have an onboarding draft waiting
   (for example when the handle was taken on adoption). Prefilling from
   it saves the user from typing the same answers twice. */
function readDraft(): DraftValues {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return typeof parsed === "object" && parsed !== null ? (parsed as DraftValues) : {};
  } catch {
    return {};
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm" style={{ color: "var(--crimson)" }}>
      {message}
    </p>
  );
}

export default function ProfileEditSheet({
  profile,
  onClose,
}: {
  profile: OwnProfile | null;
  onClose: () => void;
}) {
  useScrollLock();
  const router = useRouter();
  const { state: sheetState, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [state, formAction, pending] = useActionState(updateProfileAction, initialProfileActionState);
  const idPrefix = useId();
  const fieldId = (field: ProfileField) => `${idPrefix}-${field}`;
  const errorId = (field: ProfileField) => `${idPrefix}-${field}-error`;

  const [draft] = useState<DraftValues>(() =>
    profile?.onboardingCompleted ? {} : readDraft(),
  );

  useEffect(() => {
    if (state.status !== "success") return;
    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch {
      // Storage can be unavailable; the saved profile is what counts.
    }
    router.refresh();
    dismiss();
  }, [state, router, dismiss]);

  const errors = state.fieldErrors ?? {};
  const defaultCity = profile?.city ?? draft.city ?? "";
  const defaultAbility = profile?.abilityLevel ?? draft.style ?? "";

  return (
    <>
      <div className="sheet-overlay" data-state={sheetState} onClick={dismiss} aria-hidden />
      <div
        ref={panelRef}
        className="sheet-panel paper-grain"
        data-state={sheetState}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idPrefix}-title`}
        tabIndex={-1}
        style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}
      >
        <div className="flex items-start justify-between px-5 pt-6 pb-4" style={{ borderBottom: "var(--rule-thin)" }}>
          <div>
            <p className="text-mono-label mb-2" style={{ color: RUST }}>Your account</p>
            <h2 id={`${idPrefix}-title`} className="text-display-md" style={{ color: INK }}>
              Edit profile
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center"
          >
            <Icon name="x" size={18} color={INK} strokeWidth={2} />
          </button>
        </div>

        <form action={formAction} className="space-y-4 px-5 pt-5" noValidate>
          <div>
            <label htmlFor={fieldId("displayName")} className="text-mono-label mb-1.5 block" style={{ color: INK }}>
              Name
            </label>
            <input
              id={fieldId("displayName")}
              name="displayName"
              className="form-input"
              autoComplete="name"
              defaultValue={profile?.displayName ?? draft.displayName ?? ""}
              aria-invalid={errors.displayName ? true : undefined}
              aria-describedby={errors.displayName ? errorId("displayName") : undefined}
              required
            />
            <FieldError id={errorId("displayName")} message={errors.displayName} />
          </div>

          <div>
            <label htmlFor={fieldId("handle")} className="text-mono-label mb-1.5 block" style={{ color: INK }}>
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
                id={fieldId("handle")}
                name="handle"
                className="form-input"
                style={{ paddingLeft: "2rem", fontFamily: "var(--font-mono-stack)" }}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={20}
                defaultValue={profile?.handle ?? draft.handle ?? ""}
                aria-invalid={errors.handle ? true : undefined}
                aria-describedby={errors.handle ? errorId("handle") : undefined}
                required
              />
            </div>
            <FieldError id={errorId("handle")} message={errors.handle} />
          </div>

          <fieldset aria-describedby={errors.city ? errorId("city") : undefined}>
            <legend className="text-mono-label mb-1.5" style={{ color: INK }}>Region</legend>
            <div className="grid grid-cols-2 gap-2">
              {CITY_OPTIONS.map((option) => (
                <label key={option.id} className="flex min-h-11 items-center gap-2 px-3" style={{ border: "var(--rule-thin)" }}>
                  <input type="radio" name="city" value={option.id} defaultChecked={defaultCity === option.id} />
                  <span className="text-sm font-semibold" style={{ color: INK }}>{option.label}</span>
                </label>
              ))}
            </div>
            <FieldError id={errorId("city")} message={errors.city} />
          </fieldset>

          <fieldset aria-describedby={errors.abilityLevel ? errorId("abilityLevel") : undefined}>
            <legend className="text-mono-label mb-1.5" style={{ color: INK }}>Riding style</legend>
            <div className="grid grid-cols-3 gap-2">
              {ABILITY_OPTIONS.map((option) => (
                <label key={option.id} className="flex min-h-11 items-center gap-2 px-3" style={{ border: "var(--rule-thin)" }}>
                  <input type="radio" name="abilityLevel" value={option.id} defaultChecked={defaultAbility === option.id} />
                  <span className="text-sm font-semibold" style={{ color: INK }}>{option.label}</span>
                </label>
              ))}
            </div>
            <FieldError id={errorId("abilityLevel")} message={errors.abilityLevel} />
          </fieldset>

          <div>
            <label htmlFor={fieldId("bio")} className="text-mono-label mb-1.5 block" style={{ color: INK }}>
              Bio <span style={{ color: INK_2 }}>(optional)</span>
            </label>
            <textarea
              id={fieldId("bio")}
              name="bio"
              className="form-input"
              rows={3}
              maxLength={300}
              defaultValue={profile?.bio ?? ""}
              aria-invalid={errors.bio ? true : undefined}
              aria-describedby={errors.bio ? errorId("bio") : undefined}
            />
            <FieldError id={errorId("bio")} message={errors.bio} />
          </div>

          <p role="status" aria-live="polite" className="min-h-5 text-sm" style={{ color: state.status === "error" ? "var(--crimson)" : INK_2 }}>
            {state.status === "error" ? state.message : ""}
          </p>

          <button
            type="submit"
            disabled={pending}
            className="card-tap w-full py-4 font-display text-xl uppercase disabled:opacity-40"
            style={{ background: INK, color: "var(--paper-0)", border: "var(--rule-thick)" }}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </>
  );
}
