import EventsScreen from "@/features/rides/EventsScreen";
import { getOwnProfile } from "@/features/profile/queries";
import { listRides } from "@/features/rides/queries";

export default async function EventsPage() {
  const [result, profile] = await Promise.all([listRides(), getOwnProfile()]);

  return (
    <EventsScreen
      live={{
        rides: result.status === "ok" ? result.rides : null,
        defaultCity: profile?.city ?? "innsbruck",
      }}
    />
  );
}
