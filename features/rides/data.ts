import { createClient } from "@/lib/supabase/server";
import type { City } from "@/lib/types";
import {
  parseCarpoolDetailRow,
  parseCarpoolFeedRows,
  parseCarpoolMemberRows,
  parseCarpoolRequestRows,
  parseRideDetailRow,
  parseRideFeedRows,
  parseRideMemberRows,
  parseRideRequestRows,
  type CarpoolDetail,
  type CarpoolFeed,
  type CarpoolMember,
  type CarpoolRequest,
  type RideDetail,
  type RideFeed,
  type RideMember,
  type RideRequest,
} from "./dto";

export type DataResult<T> =
  | Readonly<{ status: "ready"; data: T }>
  | Readonly<{ status: "unavailable" }>;

export type DetailResult<T> =
  | DataResult<T>
  | Readonly<{ status: "not-found" }>;

export async function getRideFeed(city: City): Promise<DataResult<RideFeed[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_ride_feed", {
      p_city: city,
      p_limit: 50,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseRideFeedRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getRideDetail(
  rideId: string,
): Promise<DetailResult<RideDetail>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_ride_detail", {
      p_ride_id: rideId,
    });
    if (error) return { status: "unavailable" };
    if (!Array.isArray(data) || data.length === 0) return { status: "not-found" };
    if (data.length !== 1) return { status: "unavailable" };

    const parsed = parseRideDetailRow(data[0]);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getCarpoolFeed(
  city: City,
): Promise<DataResult<CarpoolFeed[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_carpool_feed", {
      p_city: city,
      p_limit: 50,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseCarpoolFeedRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getCarpoolDetail(
  carpoolId: string,
): Promise<DetailResult<CarpoolDetail>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_carpool_detail", {
      p_carpool_id: carpoolId,
    });
    if (error) return { status: "unavailable" };
    if (!Array.isArray(data) || data.length === 0) return { status: "not-found" };
    if (data.length !== 1) return { status: "unavailable" };

    const parsed = parseCarpoolDetailRow(data[0]);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getRideMembers(
  rideId: string,
): Promise<DataResult<RideMember[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_ride_members", {
      p_ride_id: rideId,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseRideMemberRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getRideRequests(
  rideId: string,
): Promise<DataResult<RideRequest[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_ride_requests", {
      p_ride_id: rideId,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseRideRequestRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getCarpoolMembers(
  carpoolId: string,
): Promise<DataResult<CarpoolMember[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_carpool_members", {
      p_carpool_id: carpoolId,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseCarpoolMemberRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getCarpoolRequests(
  carpoolId: string,
): Promise<DataResult<CarpoolRequest[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_carpool_requests", {
      p_carpool_id: carpoolId,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseCarpoolRequestRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
