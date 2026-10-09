"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readConsent } from "@/features/privacy/consent";
import { setAnalyticsConsentAction } from "@/features/privacy/actions";
import {
  createPostHogAnalytics,
  type ConsentBoundAnalytics,
} from "@/features/privacy/posthog";

type PrivacySettingsProps = Readonly<{
  analytics?: ConsentBoundAnalytics;
}>;

const INK = "var(--ink-0)";
const MUTED = "var(--ink-2)";
const PAPER = "var(--paper-0)";
const PAPER_1 = "var(--paper-1)";
const PINE = "var(--pine)";
const RUST = "var(--rust)";

const subscribeToBrowserState = () => () => undefined;
const getServerSnapshot = () => false;
const getBrowserSnapshot = () => true;

function getSavedAnalyticsConsent(): boolean {
  return readConsent(window.localStorage).analytics === "granted";
}

function ConsentSwitch({
  checked,
  disabled,
  label,
  onChange,
}: Readonly<{
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 flex-shrink-0 border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust focus-visible:ring-offset-2 disabled:opacity-50"
      style={{
        background: checked ? PINE : "var(--paper-2)",
        borderColor: INK,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] h-4 w-4 transition-transform"
        style={{
          background: checked ? PAPER : INK,
          left: 3,
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

export default function PrivacySettings({ analytics }: PrivacySettingsProps) {
  const analyticsRef = useRef<ConsentBoundAnalytics | null>(analytics ?? null);
  const savedAnalyticsConsent = useSyncExternalStore(
    subscribeToBrowserState,
    getSavedAnalyticsConsent,
    getServerSnapshot,
  );
  const loaded = useSyncExternalStore(
    subscribeToBrowserState,
    getBrowserSnapshot,
    getServerSnapshot,
  );
  const [analyticsSelection, setAnalyticsSelection] = useState<boolean | null>(
    null,
  );
  const [status, setStatus] = useState<"error" | "saved" | null>(null);
  const [saving, setSaving] = useState(false);
  const analyticsEnabled = analyticsSelection ?? savedAnalyticsConsent;

  function analyticsClient(): ConsentBoundAnalytics {
    analyticsRef.current ??= createPostHogAnalytics();
    return analyticsRef.current;
  }

  useEffect(() => {
    const client = analyticsClient();
    if (client.sync()) {
      client.capture("privacy_settings_viewed", { source: "direct" });
    }

  }, []);

  async function saveSelection() {
    setStatus(null);
    setSaving(true);
    const client = analyticsClient();

    try {
      if (typeof globalThis.crypto?.randomUUID !== "function") {
        setStatus("error");
        return;
      }

      if (!analyticsEnabled) {
        client.withdraw();
      }

      const result = await setAnalyticsConsentAction({
        enabled: analyticsEnabled,
        idempotencyKey: globalThis.crypto.randomUUID(),
      });
      if (!result.ok) {
        setStatus("error");
        return;
      }

      if (analyticsEnabled) {
        if (!result.analyticsId || !client.optIn(result.analyticsId)) {
          setStatus("error");
          return;
        }
        client.capture("analytics_opt_in_confirmed", {
          source: "privacy_settings",
        });
      }

      setStatus("saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="paper-grain min-h-full" style={{ background: PAPER }}>
      <header
        className="sticky top-0 z-40 px-4 pb-4 pt-4"
        style={{ background: PAPER, borderBottom: "var(--rule-heavy)" }}
      >
        <Link
          href="/profile"
          aria-label="Zurück zum Profil"
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          style={{ color: INK }}
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
          Profil
        </Link>
        <p className="text-mono-label mb-2" style={{ color: RUST }}>
          Einstellungen
        </p>
        <h1 className="text-display-md" style={{ color: INK }}>
          Datenschutz
        </h1>
      </header>

      <main className="px-4 pb-10 pt-6">
        <section aria-labelledby="consent-heading">
          <div className="section-rule">
            <h2 id="consent-heading" className="text-mono-label" style={{ color: INK }}>
              Deine Auswahl
            </h2>
            <ShieldCheck aria-hidden="true" size={18} color={PINE} />
          </div>

          <div style={{ borderTop: "var(--rule-thin)" }}>
            <div
              className="flex items-start gap-3 px-3 py-4"
              style={{ background: PAPER_1, borderBottom: "var(--rule-thin)" }}
            >
              <LockKeyhole aria-hidden="true" size={20} color={PINE} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <label htmlFor="necessary-consent" className="font-semibold" style={{ color: INK }}>
                  Notwendige Funktionen
                </label>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: MUTED }}>
                  Anmeldung, Sicherheit und deine ausdrücklich gewählten Einstellungen.
                </p>
              </div>
              <input
                id="necessary-consent"
                type="checkbox"
                checked
                disabled
                readOnly
                className="mt-1 h-6 w-6 accent-[var(--pine)]"
              />
            </div>

            <div
              className="flex items-start gap-3 px-3 py-4"
              style={{ background: PAPER_1, borderBottom: "var(--rule-thin)" }}
            >
              <BarChart3 aria-hidden="true" size={20} color={RUST} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p id="analytics-label" className="font-semibold" style={{ color: INK }}>
                  Anonyme Nutzungsanalyse
                </p>
                <p id="analytics-description" className="mt-1 text-sm leading-relaxed" style={{ color: MUTED }}>
                  Hilft uns, stabile Abläufe zu erkennen. Keine Namen, Texte, Beziehungen oder Standortdaten.
                </p>
              </div>
              <ConsentSwitch
                checked={analyticsEnabled}
                disabled={!loaded || saving}
                label="Anonyme Nutzungsanalyse"
                onChange={(checked) => {
                  setAnalyticsSelection(checked);
                  setStatus(null);
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed" style={{ color: MUTED }}>
            Pistl funktioniert auch ohne Nutzungsanalyse. Du kannst deine Auswahl jederzeit ändern.
          </p>

          <button
            type="button"
            onClick={() => void saveSelection()}
            disabled={!loaded || saving}
            className="mt-5 min-h-12 w-full px-4 py-3 font-display text-base uppercase disabled:opacity-50"
            style={{
              background: RUST,
              border: "var(--rule-thick)",
              boxShadow: "var(--shadow-print)",
              color: PAPER,
            }}
          >
            Auswahl speichern
          </button>

          {status === "saved" ? (
            <p role="status" className="mt-4 text-sm font-semibold" style={{ color: PINE }}>
              Datenschutzauswahl gespeichert.
            </p>
          ) : null}
          {status === "error" ? (
            <p role="alert" className="mt-4 text-sm font-semibold" style={{ color: "var(--status-danger)" }}>
              Die Auswahl konnte auf diesem Gerät nicht gespeichert werden.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="analytics-scope-heading" className="mt-8">
          <div className="section-rule">
            <h2 id="analytics-scope-heading" className="text-mono-label" style={{ color: INK }}>
              Analyse-Grenzen
            </h2>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed" style={{ color: MUTED }}>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-mono-label" style={{ color: PINE }}>01</span>
              Erst nach deiner aktiven Zustimmung.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-mono-label" style={{ color: PINE }}>02</span>
              Zufällige Kennung statt Konto-ID oder E-Mail.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-mono-label" style={{ color: PINE }}>03</span>
              Keine automatische Erfassung und keine Sitzungsaufzeichnung.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
