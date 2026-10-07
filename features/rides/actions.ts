"use server";

import { getT } from "@/lib/i18n/server";
import { translateValidation } from "@/lib/i18n/translate";
import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { dispatchPushSoon } from "@/lib/push/dispatch";
import { validateRideEdit, validateRideInput } from "./ride-input";

/* pending: the viewer asked to join and waits for the host. */
export type RideActionResult = { ok: true; message: string; pending?: boolean } | { ok: false; message: string };

function revalidateRides() {
  revalidateApp();
}

const PROFILE_INCOMPLETE = "common.profileIncomplete";

/* Postgres' code for a failed RLS check. On the ride insert the only
   policy condition a signed-in client can miss is the finished profile. */
const RLS_VIOLATION = "42501";

const JOIN_MESSAGES: Record<string, RideActionResult> = {
  joined: { ok: true, message: "rides.joined" },
  requested: { ok: true, message: "rides.requested", pending: true },
  already_requested: { ok: true, message: "rides.alreadyRequested", pending: true },
  already_joined: { ok: true, message: "rides.alreadyJoined" },
  full: { ok: false, message: "rides.full" },
  host: { ok: false, message: "rides.host" },
  past: { ok: false, message: "rides.past" },
  not_found: { ok: false, message: "rides.notFound" },
  profile_incomplete: { ok: false, message: PROFILE_INCOMPLETE },
};

const UNAVAILABLE: RideActionResult = {
  ok: false,
  message: "common.unavailable",
};

async function createRideActionImpl(input: unknown): Promise<RideActionResult> {
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
        return { ok: false, message: "rides.adultsOnly" };
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
  return { ok: true, message: "rides.posted" };
}

async function callRideFunction(
  fn: "join_ride" | "leave_ride" | "cancel_ride",
  rideId: string,
): Promise<{ data: unknown } | null> {
  if (typeof rideId !== "string" || rideId.length === 0) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, { target_ride: rideId });
    if (!error && fn === "join_ride") await dispatchPushSoon(supabase);
    return error ? null : { data };
  } catch {
    return null;
  }
}

async function joinRideActionImpl(rideId: string): Promise<RideActionResult> {
  const result = await callRideFunction("join_ride", rideId);
  if (!result) return UNAVAILABLE;

  revalidateRides();
  return JOIN_MESSAGES[String(result.data)] ?? UNAVAILABLE;
}

async function leaveRideActionImpl(rideId: string): Promise<RideActionResult> {
  const result = await callRideFunction("leave_ride", rideId);
  if (!result) return UNAVAILABLE;

  revalidateRides();
  return result.data === true
    ? { ok: true, message: "rides.left" }
    : { ok: false, message: "rides.notOnRide" };
}

async function cancelRideActionImpl(rideId: string): Promise<RideActionResult> {
  const result = await callRideFunction("cancel_ride", rideId);
  if (!result) return UNAVAILABLE;

  revalidateRides();
  return result.data === true
    ? { ok: true, message: "rides.cancelled" }
    : { ok: false, message: "rides.onlyHostCancel" };
}

async function updateRideActionImpl(rideId: string, input: unknown): Promise<RideActionResult> {
  const validation = validateRideEdit(input);
  if (!validation.success) return { ok: false, message: validation.message };
  if (typeof rideId !== "string" || rideId.length === 0) return UNAVAILABLE;

  const edit = validation.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("update_ride", {
      target_ride: rideId,
      new_meet_time: edit.meetTime,
      new_meet_point: edit.meetPoint,
      new_total_spots: edit.totalSpots,
      new_caption: edit.caption,
    });

    if (error) return UNAVAILABLE;
    if (data === "below_taken") {
      return { ok: false, message: "rides.belowTaken" };
    }
    if (data !== "updated") return { ok: false, message: "rides.onlyHostEdit" };
  } catch {
    return UNAVAILABLE;
  }

  revalidateRides();
  return { ok: true, message: "rides.updated" };
}

const RESPOND_MESSAGES: Record<string, RideActionResult> = {
  accepted: { ok: true, message: "rides.letIn" },
  declined: { ok: true, message: "rides.declined" },
  full: { ok: false, message: "rides.fullAddSpots" },
  not_found: { ok: false, message: "rides.requestGone" },
};

async function respondRideRequestActionImpl(
  rideId: string,
  requesterId: string,
  accept: boolean,
): Promise<RideActionResult> {
  if (!rideId || !requesterId) return UNAVAILABLE;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("respond_ride_request", {
      target_ride: rideId,
      requester: requesterId,
      accept,
    });
    if (error) return UNAVAILABLE;
    revalidateRides();
    if (accept) await dispatchPushSoon(supabase);
    return RESPOND_MESSAGES[String(data)] ?? UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}

/* Results carry message keys; the exported actions translate them once,
   in the caller's language. */
async function localize<T>(result: T): Promise<T> {
  if (typeof result !== "object" || result === null || !("message" in result)) return result;
  const t = await getT();
  return { ...result, message: translateValidation(t, String(result.message)) };
}

export async function createRideAction(input: unknown): Promise<RideActionResult> {
  return localize(await createRideActionImpl(input));
}

export async function joinRideAction(rideId: string): Promise<RideActionResult> {
  return localize(await joinRideActionImpl(rideId));
}

export async function leaveRideAction(rideId: string): Promise<RideActionResult> {
  return localize(await leaveRideActionImpl(rideId));
}

export async function cancelRideAction(rideId: string): Promise<RideActionResult> {
  return localize(await cancelRideActionImpl(rideId));
}

export async function updateRideAction(rideId: string, input: unknown): Promise<RideActionResult> {
  return localize(await updateRideActionImpl(rideId, input));
}

export async function respondRideRequestAction(rideId: string,
  requesterId: string,
  accept: boolean,): Promise<RideActionResult> {
  return localize(await respondRideRequestActionImpl(rideId, requesterId, accept));
}
