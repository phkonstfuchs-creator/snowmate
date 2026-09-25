import type { ResortStatus } from "@/lib/types";
import type { LiveRide } from "@/features/rides/live-ride";

/* The fixture resort list carries invented rider counts. With real data,
   the only honest count is people on today's rides the viewer can see:
   each host plus everyone who joined. */
export function applyRideActivity(resorts: readonly ResortStatus[], rides: readonly LiveRide[]): ResortStatus[] {
  const today = rides.filter((ride) => ride.post.date === "Today");

  return resorts.map((resort) => {
    const here = today.filter((ride) => ride.post.resort === resort.name && ride.post.city === resort.city);
    const people = (level: LiveRide["post"]["abilityLevel"]) =>
      here.filter((ride) => ride.post.abilityLevel === level).reduce((sum, ride) => sum + 1 + ride.post.takenSpots, 0);

    const chillRiders = people("chill");
    const parkRiders = people("park");
    const offPisteRiders = people("off-piste");

    return {
      ...resort,
      ridersNow: chillRiders + parkRiders + offPisteRiders,
      chillRiders,
      parkRiders,
      offPisteRiders,
    };
  });
}

export function ridesAt(resort: Pick<ResortStatus, "name" | "city">, rides: readonly LiveRide[]): LiveRide[] {
  return rides.filter(
    (ride) => ride.post.date === "Today" && ride.post.resort === resort.name && ride.post.city === resort.city,
  );
}
