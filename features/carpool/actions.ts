"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateCarpoolInput } from "./carpool-input";

export type CarpoolActionResult = { ok: boolean; message: string };

const UNAVAILABLE: CarpoolActionResult = { ok: false, message: "That did not work. Try again shortly." };

const MESSAGES: Record<string, CarpoolActionResult> = {
  requested: { ok: true, message: "Asked. The author decides." },
  already_requested: { ok: true, message: "You already asked." },
  own: { ok: false, message: "This is your own post." },
  past: { ok: false, message: "This carpool has already left." },
  not_found: { ok: false, message: "This carpool is no longer available." },
  accepted: { ok: true, message: "Confirmed." },
  declined: { ok: true, message: "Declined." },
  full: { ok: false, message: "All seats are taken." },
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

export async function createCarpoolAction(input: unknown): Promise<CarpoolActionResult> {
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
    if (error) return UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }

  revalidatePath("/carpool");
  return { ok: true, message: "Posted." };
}

export async function requestCarpoolAction(carpoolId: string): Promise<CarpoolActionResult> {
  return mapStatus(await rpc("request_carpool", { target_carpool: carpoolId }));
}

export async function withdrawCarpoolRequestAction(carpoolId: string): Promise<CarpoolActionResult> {
  const data = await rpc("withdraw_carpool_request", { target_carpool: carpoolId });
  if (data === UNAVAILABLE_SENTINEL) return UNAVAILABLE;
  return data === true ? { ok: true, message: "Request withdrawn." } : { ok: false, message: "There was nothing to withdraw." };
}

export async function respondCarpoolRequestAction(
  carpoolId: string,
  requesterId: string,
  accept: boolean,
): Promise<CarpoolActionResult> {
  return mapStatus(
    await rpc("respond_carpool_request", { target_carpool: carpoolId, requester: requesterId, accept }),
  );
}

export async function cancelCarpoolAction(carpoolId: string): Promise<CarpoolActionResult> {
  const data = await rpc("cancel_carpool", { target_carpool: carpoolId });
  if (data === UNAVAILABLE_SENTINEL) return UNAVAILABLE;
  return data === true ? { ok: true, message: "Carpool removed." } : { ok: false, message: "Only the author can remove this." };
}
