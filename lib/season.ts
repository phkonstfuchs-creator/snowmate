/* The ski season shown in the app, e.g. "26/27". It starts on
   1 September, like private.season_start() in the leaderboards. */
export function seasonLabel(now: Date = new Date()): string {
  const year = now.getFullYear() - (now.getMonth() < 8 ? 1 : 0);
  return `${String(year % 100).padStart(2, "0")}/${String((year + 1) % 100).padStart(2, "0")}`;
}
