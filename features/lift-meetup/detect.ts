import type { Lift } from "@/lib/lifts";
import { distanceMeters, type Position } from "@/features/location/location";
import { alongLift } from "@/features/location/whereabouts";

/* "Which lift are you taking?" answered from the rider's own position, so
   starting a meetup is one tap instead of two lists. The position stays
   on the phone; only the chosen lift is sent, as before (ADR 0029). */

export interface DetectedLift {
  lift: Lift;
  how: "riding" | "at_bottom" | "near";
}

const RIDING_CORRIDOR_M = 30;
const AT_BOTTOM_M = 120;
const NEAR_M = 400;

export function detectLift(position: Position | null, lifts: readonly Lift[]): DetectedLift | null {
  if (!position) return null;
  const fuzz = Math.min(position.accuracy ?? 30, 50);

  let riding: { lift: Lift; offsetM: number } | null = null;
  for (const lift of lifts) {
    const { t, offsetM } = alongLift(position, lift);
    if (t > 0.03 && t < 0.97 && offsetM <= RIDING_CORRIDOR_M + fuzz && (!riding || offsetM < riding.offsetM)) riding = { lift, offsetM };
  }
  if (riding) return { lift: riding.lift, how: "riding" };

  let nearest: { lift: Lift; distance: number } | null = null;
  for (const lift of lifts) {
    const distance = distanceMeters(position, { lat: lift.bottomCoordinates[0], lng: lift.bottomCoordinates[1] });
    if (!nearest || distance < nearest.distance) nearest = { lift, distance };
  }
  if (!nearest || nearest.distance > NEAR_M + fuzz) return null;
  return { lift: nearest.lift, how: nearest.distance <= AT_BOTTOM_M + fuzz ? "at_bottom" : "near" };
}
