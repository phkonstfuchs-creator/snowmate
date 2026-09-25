import type { LiveRide } from "@/features/rides/live-ride";
import type { FriendGraph } from "@/features/crew/friendships";
import type { AccountStats } from "./ProfileScreen";

/* Numbers the backend can actually back: rides hosted or joined, the
   distinct resorts among them, and confirmed friends. */
export function computeAccountStats(rides: readonly LiveRide[] | null, graph: FriendGraph | null): AccountStats | null {
  if (rides === null && graph === null) return null;

  const mine = (rides ?? []).filter((ride) => ride.isHost || ride.isJoined);
  return {
    rides: mine.length,
    resorts: new Set(mine.map((ride) => ride.post.resort)).size,
    crew: graph?.friends.length ?? 0,
  };
}
