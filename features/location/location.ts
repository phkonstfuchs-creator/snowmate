import type { MessageKey } from "@/lib/i18n/translate";

/* How long sharing lasts once started. The database refuses anything
   outside 5 minutes to 12 hours. */
export const SHARE_DURATIONS = [
  { minutes: 60, label: "loc.for1h" },
  { minutes: 240, label: "loc.for4h" },
  { minutes: 720, label: "loc.forDay" },
] as const satisfies readonly { minutes: number; label: MessageKey }[];

export type ShareMinutes = (typeof SHARE_DURATIONS)[number]["minutes"];

export function isShareMinutes(value: unknown): value is ShareMinutes {
  return SHARE_DURATIONS.some((option) => option.minutes === value);
}

export interface Position {
  lat: number;
  lng: number;
  /* metres, as the device reports it */
  accuracy: number | null;
}

export interface FriendLocation extends Position {
  userId: string;
  name: string;
  handle: string | null;
  updatedAt: string;
}

export interface FriendLocationRow {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  updated_at: string;
}

export function toFriendLocation(row: FriendLocationRow): FriendLocation {
  return {
    userId: row.user_id,
    name: row.display_name ?? row.handle ?? "?",
    handle: row.handle,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy_m,
    updatedAt: row.updated_at,
  };
}

export function isValidPosition(value: unknown): value is Position {
  if (typeof value !== "object" || value === null) return false;
  const { lat, lng, accuracy } = value as Record<string, unknown>;
  return (
    typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && lng >= -180 && lng <= 180 &&
    (accuracy === null || accuracy === undefined || (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0))
  );
}

/* Great-circle distance in metres. */
export function distanceMeters(a: Pick<Position, "lat" | "lng">, b: Pick<Position, "lat" | "lng">): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* While sharing, a new position goes out when it moved noticeably or
   the last one is getting old; this keeps writes low on a phone. */
export function shouldSendUpdate(
  last: { position: Position; at: number } | null,
  next: Position,
  now: number,
): boolean {
  if (!last) return true;
  const elapsed = now - last.at;
  if (elapsed < 15_000) return false;
  return distanceMeters(last.position, next) >= 20 || elapsed >= 60_000;
}

/* "2 min ago" style age of a friend's position. */
export function minutesSince(iso: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
}

export type ShareResult = "sharing" | "throttled" | "invalid" | "profile_incomplete" | "unauthenticated" | "unavailable";

export const SHARE_MESSAGES: Record<Exclude<ShareResult, "sharing" | "throttled">, MessageKey> = {
  invalid: "loc.invalid",
  profile_incomplete: "common.profileIncomplete",
  unauthenticated: "profile.sessionEnded",
  unavailable: "common.unavailable",
};
