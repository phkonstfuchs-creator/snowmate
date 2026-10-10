/** OSM aerialway durations are numeric minutes and remain unverified source data. */
export function formatMountainDuration(value: string | undefined, locale = "de"): string | null {
  if (!value || !/^\d+(?:\.\d+)?$/u.test(value)) return null;
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 120) return null;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(minutes)} min`;
}
