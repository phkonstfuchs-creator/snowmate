export type AnalyticsEvent = Readonly<{
  event: AnalyticsEventName;
  properties: Readonly<Record<string, string>>;
}>;

export type AnalyticsEventName =
  | "analytics_opt_in_confirmed"
  | "privacy_settings_viewed"
  | "pwa_service_worker_registered";

type EventRule = Readonly<Record<string, readonly string[]>>;

const EVENT_RULES: Readonly<Record<AnalyticsEventName, EventRule>> = {
  analytics_opt_in_confirmed: {
    source: ["privacy_settings"],
  },
  privacy_settings_viewed: {
    source: ["direct", "profile"],
  },
  pwa_service_worker_registered: {
    result: ["registered"],
  },
};

const FORBIDDEN_KEY_PARTS = [
  "coordinate",
  "email",
  "friend",
  "handle",
  "latitude",
  "location",
  "longitude",
  "message",
  "name",
  "socialgraph",
  "text",
  "userid",
] as const;

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function containsForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(containsForbiddenKey);
  }

  return Object.entries(value).some(([key, nested]) => {
    const normalized = normalizedKey(key);
    return (
      FORBIDDEN_KEY_PARTS.some((part) => normalized.includes(part)) ||
      containsForbiddenKey(nested)
    );
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && value in EVENT_RULES;
}

export function createAnalyticsEvent(
  name: unknown,
  payload: unknown,
): AnalyticsEvent | null {
  if (
    !isAnalyticsEventName(name) ||
    !isPlainRecord(payload) ||
    containsForbiddenKey(payload)
  ) {
    return null;
  }

  const rule = EVENT_RULES[name];
  const keys = Object.keys(payload);
  const expectedKeys = Object.keys(rule);

  if (
    keys.length !== expectedKeys.length ||
    !keys.every((key) => Object.hasOwn(rule, key))
  ) {
    return null;
  }

  const properties: Record<string, string> = {};
  for (const key of expectedKeys) {
    const value = payload[key];
    const allowedValues = rule[key];

    if (
      typeof value !== "string" ||
      !allowedValues ||
      !allowedValues.includes(value)
    ) {
      return null;
    }
    properties[key] = value;
  }

  return { event: name, properties };
}
