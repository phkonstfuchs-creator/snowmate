import type { RidePost, User, VisibleRide } from "@/lib/types";

/* Tiered visibility for rides.
 *
 * The rule is the same everywhere: everyone sees the resort, only
 * those who joined see the exact meeting point. For public events
 * this weighs more, because strangers are reading along too.
 *
 * WARNING: this is presentation, not enforcement. As long as the
 * server ships the meeting point, it sits in the API response
 * regardless. The server-side rule is filed as item 5 in
 * docs/BACKEND_REQUESTS.md.
 */

interface ViewerContext {
  viewer: User;
  /* The author object, so the minor rule needs no second lookup */
  author: User;
  isJoined: boolean;
  friendIds: readonly string[];
}

/* Minors must not broadcast to strangers. Same rule as in the
   README: profiles, rides, locations and messages of minors use the
   narrower "confirmed friends" audience. */
export function canPostPublicRide(user: Pick<User, "isMinor">): boolean {
  return !user.isMinor;
}

/* A public ride hosted by a minor is a data error, not a valid
   state. We keep it out of the public list rather than trusting
   the input. */
export function isDiscoverablePublicRide(
  post: Pick<RidePost, "visibility">,
  author: Pick<User, "isMinor">,
): boolean {
  return post.visibility === "public" && canPostPublicRide(author);
}

export function canSeeMeetingPoint({
  viewer,
  author,
  isJoined,
  friendIds,
}: ViewerContext): boolean {
  if (viewer.id === author.id) return true;
  if (isJoined) return true;

  /* For "friends" the friendship alone carries it; for "public" it
     does not, otherwise joining would mean nothing. */
  return friendIds.includes(author.id);
}

export function toVisibleRide(
  post: RidePost,
  context: ViewerContext,
): VisibleRide {
  const { meetPoint, ...rest } = post;

  const unlocked =
    post.visibility === "friends"
      ? canSeeMeetingPoint(context)
      : context.viewer.id === context.author.id || context.isJoined;

  return {
    post: rest,
    meetPoint: unlocked ? meetPoint : null,
    meetPointLocked: !unlocked,
  };
}
