"use server";

import { getT } from "@/lib/i18n/server";
import { translateValidation } from "@/lib/i18n/translate";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateCarpoolInput } from "./carpool-input";

export type CarpoolActionResult = { ok: boolean; message: string };

const UNAVAILABLE: CarpoolActionResult = { ok: false, message: "common.unavailable" };

const MESSAGES: Record<string, CarpoolActionResult> = {
  requested: { ok: true, message: "carpool.requested" },
  already_requested: { ok: true, message: "carpool.alreadyRequested" },
  own: { ok: false, message: "carpool.own" },
  past: { ok: false, message: "carpool.past" },
  not_found: { ok: false, message: "carpool.notFound" },
  accepted: { ok: true, message: "carpool.confirmed" },
  declined: { ok: true, message: "rides.declined" },
  full: { ok: false, message: "carpool.full" },
  profile_incomplete: { ok: false, message: "common.profileIncomplete" },
};

const UNAVAILABLE_SENTINEL = Symbol("unavailable");

async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return UNAVAILABLE_SENTINEL;
    revalidatePath("/carpool");
    return data;
  } catch {
    return UNAVAILABLE_SENTINEL;
  }
}

function mapStatus(data: unknown): CarpoolActionResult {
  return typeof data === "string" ? MESSAGES[data] ?? UNAVAILABLE : UNAVAILABLE;
}

async function createCarpoolActionImpl(input: unknown): Promise<CarpoolActionResult> {
  const validation = validateCarpoolInput(input);
  if (!validation.success) return { ok: false, message: validation.message };

  const pool = validation.data;

  try {
    const supabase = await createClient();
    /* author_id is not sent: the database defaults it to the caller. */
    const { error } = await supabase.from("carpools").insert({
      role: pool.role,
      resort: pool.resort,
      city: pool.city,
      ride_date: pool.rideDate,
      departure_point: pool.departurePoint,
      departure_time: pool.departureTime,
      seats: pool.seats,
      note: pool.note,
    });
    if (error) {
      /* A failed RLS check here means the profile is not finished. */
      return error.code === "42501" ? MESSAGES.profile_incomplete! : UNAVAILABLE;
    }
  } catch {
    return UNAVAILABLE;
  }

  revalidatePath("/carpool");
  return { ok: true, message: "carpool.posted" };
}

async function requestCarpoolActionImpl(carpoolId: string): Promise<CarpoolActionResult> {
  return mapStatus(await rpc("request_carpool", { target_carpool: carpoolId }));
}

async function withdrawCarpoolRequestActionImpl(carpoolId: string): Promise<CarpoolActionResult> {
  const data = await rpc("withdraw_carpool_request", { target_carpool: carpoolId });
  if (data === UNAVAILABLE_SENTINEL) return UNAVAILABLE;
  return data === true ? { ok: true, message: "carpool.withdrawn" } : { ok: false, message: "carpool.nothingToWithdraw" };
}

async function respondCarpoolRequestActionImpl(
  carpoolId: string,
  requesterId: string,
  accept: boolean,
): Promise<CarpoolActionResult> {
  return mapStatus(
    await rpc("respond_carpool_request", { target_carpool: carpoolId, requester: requesterId, accept }),
  );
}

async function cancelCarpoolActionImpl(carpoolId: string): Promise<CarpoolActionResult> {
  const data = await rpc("cancel_carpool", { target_carpool: carpoolId });
  if (data === UNAVAILABLE_SENTINEL) return UNAVAILABLE;
  return data === true ? { ok: true, message: "carpool.removed" } : { ok: false, message: "carpool.onlyAuthor" };
}

/* Results carry message keys; the exported actions translate them once,
   in the caller's language. */
async function localize<T>(result: T): Promise<T> {
  if (typeof result !== "object" || result === null || !("message" in result)) return result;
  const t = await getT();
  return { ...result, message: translateValidation(t, String(result.message)) };
}

export async function createCarpoolAction(input: unknown): Promise<CarpoolActionResult> {
  return localize(await createCarpoolActionImpl(input));
}

export async function requestCarpoolAction(carpoolId: string): Promise<CarpoolActionResult> {
  return localize(await requestCarpoolActionImpl(carpoolId));
}

export async function withdrawCarpoolRequestAction(carpoolId: string): Promise<CarpoolActionResult> {
  return localize(await withdrawCarpoolRequestActionImpl(carpoolId));
}

export async function respondCarpoolRequestAction(carpoolId: string,
  requesterId: string,
  accept: boolean,): Promise<CarpoolActionResult> {
  return localize(await respondCarpoolRequestActionImpl(carpoolId, requesterId, accept));
}

export async function cancelCarpoolAction(carpoolId: string): Promise<CarpoolActionResult> {
  return localize(await cancelCarpoolActionImpl(carpoolId));
}
