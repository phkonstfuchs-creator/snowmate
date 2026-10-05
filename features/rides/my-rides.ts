import type { LiveRide } from "./live-ride";

/* The viewer's own rides (hosted or joined), split into what is coming
   up (soonest first) and the most recent past ones (latest first). */
export function splitMyRides(rides: readonly LiveRide[], today: string, pastLimit = 5): { upcoming: LiveRide[]; past: LiveRide[] } {
  const mine = rides.filter((ride) => (ride.isHost || ride.isJoined) && ride.rideDate);
  const upcoming = mine.filter((ride) => ride.rideDate! >= today).sort((a, b) => a.rideDate!.localeCompare(b.rideDate!));
  const past = mine
    .filter((ride) => ride.rideDate! < today)
    .sort((a, b) => b.rideDate!.localeCompare(a.rideDate!))
    .slice(0, pastLimit);
  return { upcoming, past };
}
