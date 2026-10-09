/** OSM aerialway durations are minutes; this is presentation, not validation in the field. */
export function formatPilotDuration(value: string | undefined): string | null {
  if (!value || !/^\d+(?:\.\d+)?$/u.test(value)) return null;
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return `${new Intl.NumberFormat("de", { maximumFractionDigits: 1 }).format(minutes)} min`;
}
