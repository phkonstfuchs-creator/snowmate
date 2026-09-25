import type { CarpoolPost, CarpoolRole, City, User } from "@/lib/types";
import { formatPostedAt, formatRideDate, profileToUser } from "@/features/rides/live-ride";

/* Row shape returned by list_carpools(). The departure point and the
   request list arrive already filtered for the viewer. */
export interface CarpoolRow {
  id: string;
  author_id: string;
  author_display_name: string | null;
  author_handle: string | null;
  role: CarpoolRole;
  resort: string;
  city: City;
  ride_date: string;
  departure_point: string | null;
  departure_point_locked: boolean;
  departure_time: string;
  seats: number;
  seats_taken: number;
  note: string | null;
  created_at: string;
  is_author: boolean;
  my_request: "pending" | "accepted" | null;
  requests: { user_id: string; display_name: string | null; handle: string | null; status: "pending" | "accepted" }[];
}

export type RequestStatus = "pending" | "accepted";

export interface LiveCarpool {
  post: CarpoolPost;
  dateLabel: string;
  author: User;
  isAuthor: boolean;
  myRequest: RequestStatus | null;
  departureLocked: boolean;
  requests: { user: User; status: RequestStatus }[];
}

export const LOCKED_DEPARTURE_LABEL = "Pickup spot shared once you are confirmed";

export function toLiveCarpool(row: CarpoolRow, now: Date): LiveCarpool {
  const requests = row.requests.map((request) => ({
    user: profileToUser({ id: request.user_id, display_name: request.display_name, handle: request.handle, city: row.city }),
    status: request.status,
  }));

  return {
    post: {
      id: row.id,
      authorId: row.author_id,
      role: row.role,
      resort: row.resort,
      city: row.city,
      departurePoint: row.departure_point ?? LOCKED_DEPARTURE_LABEL,
      departureTime: row.departure_time.slice(0, 5),
      totalSeats: row.seats,
      availableSeats: Math.max(0, row.seats - row.seats_taken),
      riders: requests.filter((request) => request.status === "accepted").map((request) => request.user.id),
      note: row.note ?? "",
      postedAt: formatPostedAt(row.created_at, now),
    },
    dateLabel: formatRideDate(row.ride_date, now),
    author: profileToUser({
      id: row.author_id,
      display_name: row.author_display_name,
      handle: row.author_handle,
      city: row.city,
    }),
    isAuthor: row.is_author,
    myRequest: row.my_request,
    departureLocked: row.departure_point_locked,
    requests,
  };
}
