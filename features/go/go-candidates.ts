import type { LiveRide } from "@/features/rides/live-ride";

/* The server has already applied audiences. This only narrows that list
   to rides with room whose Vienna start is still ahead. */
export function goCandidates(rides: readonly LiveRide[], now: Date): LiveRide[] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) => parts.find((value) => value.type === name)?.value ?? "";
  const localNow = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  return rides.filter((ride) => {
    const date = ride.rideDate;
    return date !== undefined && /^\d{4}-\d{2}-\d{2}$/u.test(date) &&
      /^\d{2}:\d{2}$/u.test(ride.post.meetTime) &&
      `${date}T${ride.post.meetTime}` > localNow &&
      !ride.isHost && !ride.isJoined && !ride.isPending &&
      ride.post.totalSpots > ride.post.takenSpots;
  }).toSorted((a, b) => `${a.rideDate}T${a.post.meetTime}`.localeCompare(`${b.rideDate}T${b.post.meetTime}`));
}
