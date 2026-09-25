import ProfileScreen from "@/features/profile/ProfileScreen";
import { computeAccountStats } from "@/features/profile/account-stats";
import { getOwnProfile } from "@/features/profile/queries";
import { getFriendGraph } from "@/features/crew/queries";
import { listRides } from "@/features/rides/queries";

export default async function ProfilePage() {
  const [account, rides, graph] = await Promise.all([
    getOwnProfile(),
    listRides(new Date(), { includePast: true }),
    getFriendGraph(),
  ]);

  return (
    <ProfileScreen
      account={account}
      stats={computeAccountStats(rides.status === "ok" ? rides.rides : null, graph)}
    />
  );
}
