"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRideInput } from "./ride-input";

export type RideActionResult = { ok: true; message: string } | { ok: false; message: string };

const RIDE_PATHS = ["/feed", "/events"] as const;

function revalidateRides() {
  RIDE_PATHS.forEach((path) => revalidatePath(path));
}

const PROFILE_INCOMPLETE = "Finish your profile first: add your name and handle on the Profile tab.";

/* Postgres' code for a failed RLS check. On the ride insert the only
   policy condition a signed-in client can miss is the finished profile. */
const RLS_VIOLATION = "42501";

const JOIN_MESSAGES: Record<string, RideActionResult> = {
  joined: { ok: true, message: "You are in." },
  already_joined: { ok: true, message: "You are already in." },
  full: { ok: false, message: "This ride is full." },
  host: { ok: false, message: "You are hosting this ride." },
  past: { ok: false, message: "This ride has already happened." },
  not_found: { ok: false, message: "This ride is no longer available." },
  profile_incomplete: { ok: false, message: PROFILE_INCOMPLETE },
};

const UNAVAILABLE: RideActionResult = {
  ok: false,
  message: "That did not work. Try again shortly.",
};

export async function createRideAction(input: unknown): Promise<RideActionResult> {
  const validation = validateRideInput(input);

  if (!validation.success) {
    return { ok: false, message: validation.message };
  }

  const ride = validation.data;

  try {
    const supabase = await createClient();
    /* host_id is not sent: the database defaults it to auth.uid() and
       RLS rejects anything else. A minor's public ride is rejected by a
       trigger, whatever the client claims. */
    const { error } = await supabase.from("rides").insert({
      resort: ride.resort,
      city: ride.city,
      ability_level: ride.abilityLevel,
      ride_date: ride.rideDate,
      meet_time: ride.meetTime,
      meet_point: ride.meetPoint,
      total_spots: ride.totalSpots,
      caption: ride.caption,
      visibility: ride.visibility,
      title: ride.visibility === "public" ? ride.title ?? null : null,
    });

    if (error) {
      if (error.message?.includes("minors cannot host public rides")) {
        return { ok: false, message: "Public events are 18 and over only." };
      }
      if (error.code === RLS_VIOLATION) {
        return { ok: false, message: PROFILE_INCOMPLETE };
      }
      return UNAVAILABLE;
    }
  } catch {
    return UNAVAILABLE;
  }

  revalidateRides();
  return { ok: true, message: "Ride posted." };
}

async function callRideFunction(
  fn: "join_ride" | "leave_ride" | "cancel_ride",
  rideId: string,
): Promise<{ data: unknown } | null> {
  if (typeof rideId !== "string" || rideId.length === 0) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, { target_ride: rideId });
    return error ? null : { data };
  } catch {
    return null;
  }
}

export async function joinRideAction(rideId: string): Promise<RideActionResult> {
  const result = await callRideFunction("join_ride", rideId);
  if (!result) return UNAVAILABLE;

  revalidateRides();
  return JOIN_MESSAGES[String(result.data)] ?? UNAVAILABLE;
}

export async function leaveRideAction(rideId: string): Promise<RideActionResult> {
  const result = await callRideFunction("leave_ride", rideId);
  if (!result) return UNAVAILABLE;

  revalidateRides();
  return result.data === true
    ? { ok: true, message: "You left the ride." }
    : { ok: false, message: "You were not on this ride." };
}

export async function cancelRideAction(rideId: string): Promise<RideActionResult> {
  const result = await callRideFunction("cancel_ride", rideId);
  if (!result) return UNAVAILABLE;

  revalidateRides();
  return result.data === true
    ? { ok: true, message: "Ride cancelled." }
    : { ok: false, message: "Only the host can cancel this ride." };
}
