import { listMyGoInterests } from "@/features/go/queries";
import { listMyDayPlans } from "@/features/day-plans/queries";
import FeedScreen from "@/features/rides/FeedScreen";
import { getOwnProfile } from "@/features/profile/queries";
import { listRides } from "@/features/rides/queries";
import { listPosts } from "@/features/posts/queries";
import { getFriendGraph } from "@/features/crew/queries";

export default async function FeedPage() {
  const [result, profile, posts, graph, goInterests, dayPlans] = await Promise.all([
    listRides(),
    getOwnProfile(),
    listPosts(),
    getFriendGraph(),
    listMyGoInterests(),
    listMyDayPlans(),
  ]);

  return (
    <FeedScreen
      live={{
        goInterests,
        dayPlans,
        rides: result.status === "ok" ? result.rides : null,
        /* Unknown counts as minor: the narrower rule is the safe default. */
        viewerIsMinor: profile?.isMinor ?? true,
        defaultCity: profile?.city ?? "innsbruck",
        profileComplete: profile?.onboardingCompleted ?? false,
        posts,
        viewerId: profile?.id,
        friendIds: graph?.friends.map((friend) => friend.user_id) ?? [],
      }}
    />
  );
}
