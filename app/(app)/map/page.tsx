import MapScreen from "@/features/resorts/MapScreen";
import { getOwnProfile } from "@/features/profile/queries";
import { listRides } from "@/features/rides/queries";

export default async function MapPage() {
  const [result, profile] = await Promise.all([listRides(), getOwnProfile()]);

  return (
    <MapScreen
      live={{
        rides: result.status === "ok" ? result.rides : null,
        defaultCity: profile?.city ?? "innsbruck",
      }}
    />
  );
}
