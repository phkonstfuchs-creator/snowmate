import ProfileScreen from "@/features/profile/ProfileScreen";
import { computeAccountStats } from "@/features/profile/account-stats";
import { getOwnProfile } from "@/features/profile/queries";
import { getFriendGraph } from "@/features/crew/queries";
import { listRides } from "@/features/rides/queries";
import { listMyBlocks } from "@/features/safety/queries";

export default async function ProfilePage() {
  const [account, rides, graph, blocked] = await Promise.all([
    getOwnProfile(),
    listRides(new Date(), { includePast: true }),
    getFriendGraph(),
    listMyBlocks(),
  ]);

  return (
    <ProfileScreen
      account={account}
      stats={computeAccountStats(rides.status === "ok" ? rides.rides : null, graph)}
      blocked={blocked ?? []}
    />
  );
}
