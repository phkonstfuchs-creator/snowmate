import FeedScreen from "@/features/rides/FeedScreen";
import { getOwnProfile } from "@/features/profile/queries";
import { listRides } from "@/features/rides/queries";

export default async function FeedPage() {
  const [result, profile] = await Promise.all([listRides(), getOwnProfile()]);

  return (
    <FeedScreen
      live={{
        rides: result.status === "ok" ? result.rides : null,
        /* Unknown counts as minor: the narrower rule is the safe default. */
        viewerIsMinor: profile?.isMinor ?? true,
        defaultCity: profile?.city ?? "innsbruck",
      }}
    />
  );
}
