/* Season leaderboards (ADR 0027). The database decides who appears and
   who is anonymous; this only shapes the rows. */

export const LEADERBOARD_SCOPES = ["friends", "region"] as const;
export const LEADERBOARD_METRICS = ["vertical", "distance", "days", "speed"] as const;

export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

export interface LeaderboardRow {
  rank: number;
  userId: string | null;
  name: string | null;
  handle: string | null;
  value: number;
  isMe: boolean;
  anonymous: boolean;
}

export interface LeaderboardDbRow {
  rank: number;
  user_id: string | null;
  display_name: string | null;
  handle: string | null;
  value: number | string;
  is_me: boolean | null;
  anonymous: boolean | null;
}

export interface LeaderboardSettings {
  friends: boolean;
  region: boolean;
}

export function isScope(value: unknown): value is LeaderboardScope {
  return typeof value === "string" && (LEADERBOARD_SCOPES as readonly string[]).includes(value);
}

export function isMetric(value: unknown): value is LeaderboardMetric {
  return typeof value === "string" && (LEADERBOARD_METRICS as readonly string[]).includes(value);
}

export function toLeaderboardRow(row: LeaderboardDbRow): LeaderboardRow {
  const anonymous = row.anonymous === true;
  return {
    rank: row.rank,
    userId: anonymous ? null : row.user_id,
    name: anonymous ? null : row.display_name ?? (row.handle ? `@${row.handle}` : null),
    handle: anonymous ? null : row.handle,
    value: Number(row.value),
    isMe: row.is_me === true,
    anonymous,
  };
}

/* The number as shown: km with one decimal under 10 km, the rest whole. */
export function formatMetric(metric: LeaderboardMetric, value: number, locale: string): string {
  if (metric === "distance") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: value < 10_000 ? 1 : 0 }).format(value / 1000);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
