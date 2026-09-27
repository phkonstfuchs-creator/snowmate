import type { RidePost } from "@/lib/types";

/* One definition of "how full is a ride", used by every screen.
   takenSpots counts people who joined; the host is not a spot. The
   database applies the same rule in join_ride(). */
type Spots = Pick<RidePost, "totalSpots" | "takenSpots">;

export function openSpots(post: Spots): number {
  return Math.max(0, post.totalSpots - post.takenSpots);
}

export function isFull(post: Spots): boolean {
  return openSpots(post) === 0;
}

/* Too late for this viewer: full, and they are not already in. */
export function isClosedTo(post: Spots, isJoined: boolean): boolean {
  return !isJoined && isFull(post);
}

export function totalOpenSpots(posts: readonly Spots[]): number {
  return posts.reduce((sum, post) => sum + openSpots(post), 0);
}
