import type { Locale } from "@/lib/i18n/locales";
import { formatPostedAt, formatRideDate, toIsoDay } from "./live-ride";

/* The /demo fixtures say "Today", "Sat 12 Jan" or "23 min ago" in English.
   These turn them into real dates relative to now, formatted like live
   data in the reader's language, so a demo weekday always matches its
   date and a German screen shows German dates (team review 2026-10-07). */

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_MS = 24 * 60 * 60 * 1000;

export function fixtureDay(label: string, now: Date): string {
  const lower = label.trim().toLowerCase();
  if (lower === "tomorrow") return toIsoDay(new Date(now.getTime() + DAY_MS));
  const weekday = WEEKDAYS.indexOf(lower.slice(0, 3));
  if (weekday < 0) return toIsoDay(now);
  const today = new Date(`${toIsoDay(now)}T12:00:00Z`).getUTCDay();
  const ahead = (weekday - today + 7) % 7;
  return toIsoDay(new Date(now.getTime() + ahead * DAY_MS));
}

const UNIT_MS: Record<string, number> = { min: 60_000, hr: 3_600_000, day: DAY_MS };

export function fixtureTimestamp(ago: string, now: Date): string {
  const match = /^(\d+)\s*(min|hr|day)/.exec(ago.trim().toLowerCase());
  const ms = match ? Number(match[1]) * UNIT_MS[match[2]!]! : 0;
  return new Date(now.getTime() - ms).toISOString();
}

export function localizeFixtureRide<T extends { date: string; postedAt: string }>(post: T, now: Date, locale: Locale): T {
  return {
    ...post,
    date: formatRideDate(fixtureDay(post.date, now), now, locale),
    postedAt: formatPostedAt(fixtureTimestamp(post.postedAt, now), now, locale),
  };
}
