import type { AbilityLevel, City, RidePost, RideVisibility, User } from "@/lib/types";
import { initialsFor } from "@/features/profile/profile-input";
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "@/lib/i18n/locales";
import { translator } from "@/lib/i18n/translate";

/* Row shape returned by the list_rides() database function. The meeting
   point and the participant list are already filtered server-side: they
   arrive null / empty for viewers who may not see them. */
export interface RideRow {
  id: string;
  host_id: string;
  host_display_name: string | null;
  host_handle: string | null;
  host_is_minor: boolean;
  resort: string;
  city: City;
  ability_level: AbilityLevel;
  ride_date: string;
  meet_time: string;
  meet_point: string | null;
  meet_point_locked: boolean;
  total_spots: number;
  taken_spots: number;
  caption: string | null;
  title: string | null;
  visibility: RideVisibility;
  created_at: string;
  is_host: boolean;
  is_joined: boolean;
  participants: { id: string; display_name: string | null; handle: string | null }[];
  /* The viewer's own participation: pending means asked, not yet let in. */
  my_status?: "pending" | "accepted" | null;
  /* Host only: friends of friends asking to join. */
  requests?: { id: string; display_name: string | null; handle: string | null }[];
}

export interface LiveRide {
  post: RidePost;
  host: User;
  participants: User[];
  isHost: boolean;
  isJoined: boolean;
  /* ISO day of the ride (Vienna); absent in the prototype's fixtures. */
  rideDate?: string;
  /* On the viewer's calendar day (Vienna); independent of the label's language. */
  isToday: boolean;
  /* Asked to join and waiting for the host. */
  isPending: boolean;
  /* Host only: people waiting for an answer. */
  requests: User[];
  meetPointLocked: boolean;
}

export const LOCKED_MEET_POINT_LABEL = "Meeting point unlocks when you join";
const LOCKED_MEET_POINT: Record<Locale, string> = {
  en: LOCKED_MEET_POINT_LABEL,
  de: "Treffpunkt wird nach dem Beitritt sichtbar",
};

/* The feed components were built around the full fixture User. A real
   account only exposes name and handle to other people, so the rest is
   neutral: no invented levels, streaks or badges. */
export function profileToUser(profile: {
  id: string;
  display_name: string | null;
  handle: string | null;
  city?: City | null;
  is_minor?: boolean;
}): User {
  return {
    id: profile.id,
    name: profile.display_name ?? profile.handle ?? "Rider",
    handle: profile.handle ?? "",
    avatar: initialsFor(profile.display_name, profile.handle),
    city: profile.city ?? "innsbruck",
    level: 1,
    levelTitle: "Rider",
    xp: 0,
    xpToNext: 100,
    isMinor: profile.is_minor ?? true,
    accountType: "standard",
    daysThisSeason: 0,
    resortsVisited: 0,
    friendsInvited: 0,
    streakWeeks: 0,
    badges: [],
    friendIds: [],
  };
}

/* Pistl's users are in Austria, but the server runs in UTC. Day
   boundaries follow Vienna time so "Today" flips at local midnight. */
export const APP_TIME_ZONE = "Europe/Vienna";

const isoDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toIsoDay(date: Date): string {
  return isoDayFormat.format(date);
}

export function formatRideDate(isoDate: string, now: Date, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const today = toIsoDay(now);
  const tomorrow = toIsoDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  if (isoDate === today) return t("common.today");
  if (isoDate === tomorrow) return t("common.tomorrow");

  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  return date.toLocaleDateString(INTL_LOCALE[locale], { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatPostedAt(isoTimestamp: string, now: Date, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / 60_000));

  if (minutes < 1) return t("common.justNow");
  if (minutes < 60) return t("common.minAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.hrAgo", { n: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t("common.yesterday") : t("common.daysAgo", { n: days });
}

export function toLiveRide(row: RideRow, now: Date, locale: Locale = DEFAULT_LOCALE): LiveRide {
  const host = profileToUser({
    id: row.host_id,
    display_name: row.host_display_name,
    handle: row.host_handle,
    city: row.city,
    is_minor: row.host_is_minor,
  });
  const participants = row.participants.map((p) => profileToUser({ ...p, city: row.city }));

  return {
    post: {
      id: row.id,
      authorId: row.host_id,
      resort: row.resort,
      city: row.city,
      abilityLevel: row.ability_level,
      date: formatRideDate(row.ride_date, now, locale),
      meetTime: row.meet_time.slice(0, 5),
      meetPoint: row.meet_point ?? LOCKED_MEET_POINT[locale],
      totalSpots: row.total_spots,
      takenSpots: row.taken_spots,
      joinedUserIds: participants.map((p) => p.id),
      caption: row.caption ?? "",
      postedAt: formatPostedAt(row.created_at, now, locale),
      visibility: row.visibility,
      ...(row.title ? { title: row.title } : {}),
    },
    host,
    participants,
    isHost: row.is_host,
    isJoined: row.is_joined,
    isToday: row.ride_date === toIsoDay(now),
    rideDate: row.ride_date,
    isPending: row.my_status === "pending",
    requests: (row.requests ?? []).map((p) => profileToUser({ ...p, city: row.city })),
    meetPointLocked: row.meet_point_locked,
  };
}
