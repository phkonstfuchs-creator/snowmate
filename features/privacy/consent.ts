export const CONSENT_STORAGE_KEY = "snowmate:privacy-consent:v2";
export const ANALYTICS_ID_STORAGE_KEY = "snowmate:analytics-id:v2";

export type AnalyticsConsent = "unset" | "granted" | "denied";

export type ConsentPreferences = Readonly<{
  version: 2;
  necessary: true;
  analytics: AnalyticsConsent;
  updatedAt: string | null;
}>;

export interface ConsentStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

type ConsentWriteOptions = Readonly<{
  analyticsId?: string;
  now?: () => Date;
}>;

export const DEFAULT_CONSENT: ConsentPreferences = Object.freeze({
  version: 2,
  necessary: true,
  analytics: "unset",
  updatedAt: null,
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function isConsentPreferences(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const analytics = candidate.analytics;
  const hasValidDecision =
    analytics === "unset" || analytics === "granted" || analytics === "denied";
  const hasValidTimestamp =
    analytics === "unset"
      ? candidate.updatedAt === null
      : isIsoTimestamp(candidate.updatedAt);

  return (
    candidate.version === 2 &&
    candidate.necessary === true &&
    hasValidDecision &&
    hasValidTimestamp
  );
}

export function readConsent(storage: ConsentStorage): ConsentPreferences {
  try {
    const stored = storage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_CONSENT;
    }

    const parsed: unknown = JSON.parse(stored);
    return isConsentPreferences(parsed) ? parsed : DEFAULT_CONSENT;
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function readAnalyticsId(storage: ConsentStorage): string | null {
  try {
    const stored = storage.getItem(ANALYTICS_ID_STORAGE_KEY);
    return stored && UUID_PATTERN.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(
  storage: ConsentStorage,
  enabled: boolean,
  options: ConsentWriteOptions = {},
): ConsentPreferences | null {
  const next: ConsentPreferences = {
    version: 2,
    necessary: true,
    analytics: enabled ? "granted" : "denied",
    updatedAt: (options.now ?? (() => new Date()))().toISOString(),
  };

  try {
    if (enabled) {
      const analyticsId = options.analyticsId;

      if (!analyticsId || !UUID_PATTERN.test(analyticsId)) {
        return null;
      }

      storage.setItem(ANALYTICS_ID_STORAGE_KEY, analyticsId);
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } else {
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
      storage.removeItem(ANALYTICS_ID_STORAGE_KEY);
    }

    return next;
  } catch {
    try {
      storage.removeItem(ANALYTICS_ID_STORAGE_KEY);
      storage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // The analytics client still shuts down for the current page lifecycle.
    }
    return null;
  }
}
