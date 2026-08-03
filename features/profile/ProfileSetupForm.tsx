"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MountainSnow, Shapes, Sun } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { AbilityLevel, City } from "@/lib/types";
import { initialProfileActionState } from "./action-state";
import { completeProfileAction } from "./actions";
import { PROFILE_DRAFT_KEY } from "./draft-storage";
import {
  parseOnboardingDraft,
  type ProfileSetupValues,
} from "./schema";

const CITY_OPTIONS: ReadonlyArray<{ value: City; label: string }> = [
  { value: "innsbruck", label: "Innsbruck" },
  { value: "salzburg", label: "Salzburg" },
];

const ABILITY_OPTIONS: ReadonlyArray<{
  value: AbilityLevel;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "chill",
    label: "Chill",
    description: "Piste, Sonne, entspannt",
    icon: Sun,
  },
  {
    value: "park",
    label: "Park",
    description: "Kicker, Rails, kreativ",
    icon: Shapes,
  },
  {
    value: "off-piste",
    label: "Off-Piste",
    description: "Powder und Backcountry",
    icon: MountainSnow,
  },
];

interface ProfileSetupFormProps {
  initialValues: ProfileSetupValues;
}

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function mergeDraft(
  current: ProfileSetupValues,
  draft: Partial<ProfileSetupValues>,
): ProfileSetupValues {
  return {
    displayName: current.displayName || draft.displayName || "",
    handle: current.handle || draft.handle || "",
    city: current.city || draft.city || "",
    abilityLevel: current.abilityLevel || draft.abilityLevel || "",
  };
}

function HydratedProfileSetupForm({
  initialValues,
}: ProfileSetupFormProps) {
  const [values, setValues] = useState(initialValues);
  const [state, formAction, isPending] = useActionState(
    completeProfileAction,
    { ...initialProfileActionState, values: initialValues },
  );
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      errorSummaryRef.current?.focus();
    }
  }, [state.status]);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Input
        label="Name"
        name="displayName"
        value={values.displayName}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            displayName: event.target.value,
          }))
        }
        autoComplete="name"
        error={state.fieldErrors?.displayName?.[0]}
        disabled={isPending}
        maxLength={50}
        required
      />

      <Input
        label="Handle"
        name="handle"
        value={values.handle}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            handle: event.target.value.toLowerCase(),
          }))
        }
        autoComplete="username"
        helper="3–20 Zeichen: a–z, 0–9 und _"
        error={state.fieldErrors?.handle?.[0]}
        disabled={isPending}
        maxLength={20}
        required
      />

      <fieldset className="flex flex-col gap-2" disabled={isPending}>
        <legend className="text-mono-label mb-2" style={{ color: "var(--ink-0)" }}>
          Region
        </legend>
        <input type="hidden" name="city" value={values.city} />
        <div
          className="grid grid-cols-2"
          style={{ border: "var(--rule-thin)" }}
        >
          {CITY_OPTIONS.map((option, index) => {
            const active = values.city === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    city: option.value,
                  }))
                }
                className="h-11 font-semibold"
                style={{
                  background: active ? "var(--ink-0)" : "var(--paper-0)",
                  color: active ? "var(--paper-0)" : "var(--ink-0)",
                  borderLeft: index === 0 ? 0 : "var(--rule-thin)",
                  letterSpacing: 0,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {state.fieldErrors?.city?.[0] ? (
          <p role="alert" className="text-sm" style={{ color: "var(--crimson)" }}>
            {state.fieldErrors.city[0]}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2" disabled={isPending}>
        <legend className="text-mono-label mb-2" style={{ color: "var(--ink-0)" }}>
          Fahrstil
        </legend>
        <input
          type="hidden"
          name="abilityLevel"
          value={values.abilityLevel}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          {ABILITY_OPTIONS.map((option) => {
            const active = values.abilityLevel === option.value;
            const OptionIcon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    abilityLevel: option.value,
                  }))
                }
                className="flex min-h-24 flex-col items-start justify-between p-3 text-left"
                style={{
                  background: active ? "var(--pine)" : "var(--paper-0)",
                  color: active ? "var(--paper-0)" : "var(--ink-0)",
                  border: "var(--rule-thin)",
                }}
              >
                <OptionIcon aria-hidden="true" size={19} strokeWidth={2} />
                <span>
                  <strong className="block text-sm">{option.label}</strong>
                  <span className="mt-1 block text-xs opacity-75">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {state.fieldErrors?.abilityLevel?.[0] ? (
          <p role="alert" className="text-sm" style={{ color: "var(--crimson)" }}>
            {state.fieldErrors.abilityLevel[0]}
          </p>
        ) : null}
      </fieldset>

      {state.status === "error" ? (
        <p
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="text-sm font-semibold outline-none"
          style={{ color: "var(--crimson)" }}
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Wird gespeichert…" : "Profil abschließen"}
      </Button>
    </form>
  );
}

export default function ProfileSetupForm({
  initialValues,
}: ProfileSetupFormProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const serializedDraft = isHydrated
    ? window.sessionStorage.getItem(PROFILE_DRAFT_KEY)
    : null;
  const draft = parseOnboardingDraft(serializedDraft);
  const invalidDraft =
    serializedDraft !== null && Object.keys(draft).length === 0;

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.removeItem(PROFILE_DRAFT_KEY);
    }

    if (isHydrated && invalidDraft) {
      window.sessionStorage.removeItem(PROFILE_DRAFT_KEY);
    }
  }, [invalidDraft, isHydrated]);

  if (!isHydrated) {
    return <div aria-hidden="true" className="min-h-[560px]" />;
  }

  return (
    <HydratedProfileSetupForm initialValues={mergeDraft(initialValues, draft)} />
  );
}
