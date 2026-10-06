import type { SkiDay } from "@/features/tracking/ski-day";

/* Stamps earned from what someone actually did (ADR 0027). Computed from
   the owner's own saved days and rides; nothing extra is stored. */

export type BadgeRarity = "common" | "rare" | "epic";

export interface BadgeDefinition {
  id: string;
  icon: string;
  rarity: BadgeRarity;
}

export interface BadgeInput {
  days: readonly SkiDay[];
  ridesHosted: number;
  ridesJoined: number;
  friends: number;
}

export const BADGES = [
  { id: "first_day", icon: "sunrise", rarity: "common" },
  { id: "early_bird", icon: "alarm", rarity: "common" },
  { id: "crew_rider", icon: "users", rarity: "common" },
  { id: "host", icon: "flame", rarity: "common" },
  { id: "vertical_10k", icon: "mountain", rarity: "common" },
  { id: "km_100", icon: "route", rarity: "rare" },
  { id: "runs_20", icon: "snowflake", rarity: "rare" },
  { id: "speed_80", icon: "zap", rarity: "rare" },
  { id: "three_resorts", icon: "map", rarity: "rare" },
  { id: "days_10", icon: "calendar-days", rarity: "rare" },
  { id: "vertical_50k", icon: "trophy", rarity: "epic" },
  { id: "speed_100", icon: "crown", rarity: "epic" },
] as const satisfies readonly BadgeDefinition[];

export type BadgeId = (typeof BADGES)[number]["id"];

/* Local hour in the Alps, where the days are skied. */
function viennaHour(iso: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Vienna" }).format(new Date(iso)));
}

export function earnedBadges({ days, ridesHosted, ridesJoined, friends }: BadgeInput): Set<BadgeId> {
  const earned = new Set<BadgeId>();
  const vertical = days.reduce((sum, day) => sum + day.verticalM, 0);
  const distance = days.reduce((sum, day) => sum + day.distanceM, 0);
  const topSpeed = days.reduce((max, day) => Math.max(max, day.maxSpeedKmh), 0);
  const resorts = new Set(days.map((day) => day.resort).filter(Boolean));

  if (days.length >= 1) earned.add("first_day");
  if (days.some((day) => viennaHour(day.startedAt) < 9)) earned.add("early_bird");
  if (ridesJoined >= 1 && friends >= 1) earned.add("crew_rider");
  if (ridesHosted >= 3) earned.add("host");
  if (vertical >= 10_000) earned.add("vertical_10k");
  if (distance >= 100_000) earned.add("km_100");
  if (days.some((day) => day.runs >= 20)) earned.add("runs_20");
  if (topSpeed >= 80) earned.add("speed_80");
  if (resorts.size >= 3) earned.add("three_resorts");
  if (days.length >= 10) earned.add("days_10");
  if (vertical >= 50_000) earned.add("vertical_50k");
  if (topSpeed >= 100) earned.add("speed_100");
  return earned;
}
