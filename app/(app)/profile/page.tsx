import ProfileScreen from "@/features/profile/ProfileScreen";
import { computeAccountStats } from "@/features/profile/account-stats";
import { getMfaEnabled, getOwnProfile } from "@/features/profile/queries";
import { getFriendGraph } from "@/features/crew/queries";
import { listRides } from "@/features/rides/queries";
import { listMyBlocks } from "@/features/safety/queries";
import { listPosts } from "@/features/posts/queries";
import { splitMyRides } from "@/features/rides/my-rides";
import { toIsoDay } from "@/features/rides/live-ride";

export default async function ProfilePage() {
  const [account, rides, graph, blocked, mfaEnabled, myPosts] = await Promise.all([
    getOwnProfile(),
    listRides(new Date(), { includePast: true }),
    getFriendGraph(),
    listMyBlocks(),
    getMfaEnabled(),
    listPosts({ onlyMine: true }),
  ]);
  const myRides = splitMyRides(rides.status === "ok" ? rides.rides : [], toIsoDay(new Date()));

  return (
    <ProfileScreen
      account={account}
      stats={computeAccountStats(rides.status === "ok" ? rides.rides : null, graph)}
      blocked={blocked ?? []}
      mfaEnabled={mfaEnabled}
      myRides={myRides}
      myPosts={myPosts}
    />
  );
}
