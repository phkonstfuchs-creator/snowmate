import { LIFTS, type Lift } from "@/lib/lifts";
import { RESORTS } from "@/lib/resorts";
import { distanceMeters, type FriendLocation } from "./location";

/* "Where is my friend, and when is he at the top?" from a position the
   friend already shares (ADR 0015, ADR 0029). Computed on the viewer's
   phone from the static OSM lift lines; nothing new is sent or stored.
   A rider skiing right under a lift line can look like riding it, so the
   UI always words this as an estimate. */

export type Whereabouts =
  | { kind: "lift"; lift: Lift; minutesToTop: number }
  | { kind: "bottom"; lift: Lift }
  | { kind: "top"; lift: Lift }
  | { kind: "resort"; resort: string }
  | { kind: "away" };

export interface FriendWhereabouts {
  friend: FriendLocation;
  where: Whereabouts;
  /* minutes since the friend's phone last sent a position */
  ageMinutes: number;
  /* older than STALE_MINUTES: shown greyed out, no lift estimate */
  stale: boolean;
}

const STATION_RADIUS_M = 80;
const LIFT_CORRIDOR_M = 30;
const RESORT_RADIUS_M = 6000;
export const STALE_MINUTES = 15;

/* Position of a point along a lift line, in a flat local frame (fine for
   a few kilometres): t from 0 (bottom) to 1 (top), and the sideways gap. */
export function alongLift(point: { lat: number; lng: number }, lift: Lift): { t: number; offsetM: number } {
  const [lat0, lng0] = lift.bottomCoordinates;
  const [lat1, lng1] = lift.topCoordinates;
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const bx = (lng1 - lng0) * mPerLng;
  const by = (lat1 - lat0) * mPerLat;
  const px = (point.lng - lng0) * mPerLng;
  const py = (point.lat - lat0) * mPerLat;
  const lengthSq = bx * bx + by * by;
  if (lengthSq === 0) return { t: 0, offsetM: Math.hypot(px, py) };
  const t = (px * bx + py * by) / lengthSq;
  const clamped = Math.max(0, Math.min(1, t));
  return { t, offsetM: Math.hypot(px - clamped * bx, py - clamped * by) };
}

export function whereabouts(point: { lat: number; lng: number; accuracy: number | null }, ageMinutes: number, lifts: readonly Lift[] = LIFTS): Whereabouts {
  const fuzz = Math.min(point.accuracy ?? 30, 50);

  let station: { lift: Lift; kind: "bottom" | "top"; distance: number } | null = null;
  for (const lift of lifts) {
    for (const kind of ["bottom", "top"] as const) {
      const [lat, lng] = kind === "bottom" ? lift.bottomCoordinates : lift.topCoordinates;
      const distance = distanceMeters(point, { lat, lng });
      if (distance <= STATION_RADIUS_M + fuzz && (!station || distance < station.distance)) station = { lift, kind, distance };
    }
  }
  if (station) return { kind: station.kind, lift: station.lift };

  let riding: { lift: Lift; t: number; offsetM: number } | null = null;
  for (const lift of lifts) {
    const { t, offsetM } = alongLift(point, lift);
    if (t > 0 && t < 1 && offsetM <= LIFT_CORRIDOR_M + fuzz && (!riding || offsetM < riding.offsetM)) riding = { lift, t, offsetM };
  }
  if (riding) {
    const remaining = riding.lift.durationMinutes * (1 - riding.t) - ageMinutes;
    if (remaining <= 0) return { kind: "top", lift: riding.lift };
    return { kind: "lift", lift: riding.lift, minutesToTop: Math.max(1, Math.round(remaining)) };
  }

  let nearest: { resort: string; distance: number } | null = null;
  for (const resort of RESORTS) {
    const distance = distanceMeters(point, { lat: resort.coordinates[0], lng: resort.coordinates[1] });
    if (distance <= RESORT_RADIUS_M && (!nearest || distance < nearest.distance)) nearest = { resort: resort.name, distance };
  }
  return nearest ? { kind: "resort", resort: nearest.resort } : { kind: "away" };
}

export function friendWhereabouts(friend: FriendLocation, now = Date.now()): FriendWhereabouts {
  const ageMinutes = Math.max(0, (now - Date.parse(friend.updatedAt)) / 60_000);
  const stale = ageMinutes > STALE_MINUTES;
  const where = whereabouts(friend, ageMinutes);
  /* An old fix says nothing about lifts or stations any more: only the
     resort is still a fair guess. */
  const honest: Whereabouts = stale && (where.kind === "lift" || where.kind === "top" || where.kind === "bottom")
    ? { kind: "resort", resort: where.lift.resort }
    : where;
  return { friend, where: honest, ageMinutes, stale };
}
