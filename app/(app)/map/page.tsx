import MapScreen from "@/features/resorts/MapScreen";
import { getOwnProfile } from "@/features/profile/queries";
import { listRides } from "@/features/rides/queries";
import { getFriendLocations, getMySharingEnd } from "@/features/location/queries";

export default async function MapPage() {
  const [result, profile, sharingEnd, friends] = await Promise.all([
    listRides(),
    getOwnProfile(),
    getMySharingEnd(),
    getFriendLocations(),
  ]);

  return (
    <MapScreen
      live={{
        rides: result.status === "ok" ? result.rides : null,
        defaultCity: profile?.city ?? "innsbruck",
        sharingEnd,
        friends,
      }}
    />
  );
}
