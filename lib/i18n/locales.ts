/* Snowmate launches in German and English. */
export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "sm_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/* An explicit choice (cookie) wins; otherwise the browser's preference;
   otherwise English. Only the primary language tag matters. */
export function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookieValue)) return cookieValue;

  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0] ?? "", q: q === undefined ? 1 : Number(q) };
    })
    .filter((entry) => entry.lang && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const entry of preferred) {
    if (isLocale(entry.lang)) return entry.lang;
  }
  return DEFAULT_LOCALE;
}

/* BCP 47 tags for Intl date formatting. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", de: "de-AT" };
