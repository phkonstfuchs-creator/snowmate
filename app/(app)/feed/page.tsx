import FeedScreen from "@/features/rides/FeedScreen";
import { getOwnProfile } from "@/features/profile/queries";
import { listRides } from "@/features/rides/queries";
import { listPosts } from "@/features/posts/queries";

export default async function FeedPage() {
  const [result, profile, posts] = await Promise.all([listRides(), getOwnProfile(), listPosts()]);

  return (
    <FeedScreen
      live={{
        rides: result.status === "ok" ? result.rides : null,
        /* Unknown counts as minor: the narrower rule is the safe default. */
        viewerIsMinor: profile?.isMinor ?? true,
        defaultCity: profile?.city ?? "innsbruck",
        profileComplete: profile?.onboardingCompleted ?? false,
        posts,
      }}
    />
  );
}
