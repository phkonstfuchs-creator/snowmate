import MapScreen from "@/features/resorts/MapScreen";
import { getOwnProfile } from "@/features/profile/queries";
import { listRides } from "@/features/rides/queries";
import { getResortConditions } from "@/features/conditions/queries";
import { isValidPosition } from "@/features/location/location";
import { getCanShareLocation, getFriendLocations, getMySharingEnd } from "@/features/location/queries";

/* A pin opened from a chat: /map?lat=…&lng=…&label=… */
function readPin(params: Record<string, string | string[] | undefined>) {
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const label = typeof params.label === "string" ? params.label.slice(0, 80) : "";
  return isValidPosition({ lat, lng, accuracy: null }) ? { lat, lng, label } : null;
}

export default async function MapPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const pin = readPin(await searchParams);
  const [result, profile, sharingEnd, friends, canShare, conditions] = await Promise.all([
    listRides(),
    getOwnProfile(),
    getMySharingEnd(),
    getFriendLocations(),
    getCanShareLocation(),
    getResortConditions(),
  ]);

  return (
    <MapScreen
      live={{
        rides: result.status === "ok" ? result.rides : null,
        defaultCity: profile?.city ?? "innsbruck",
        sharingEnd,
        friends,
        canShare,
        conditions,
        pin,
      }}
    />
  );
}
