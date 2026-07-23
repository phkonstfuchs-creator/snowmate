import type { RidePost, User } from "@/lib/types";
import { toggleSetValue } from "@/lib/collections";

interface CreateRideViewInput {
  post: RidePost;
  joinedUsers: readonly User[];
  currentUser: User;
  isJoined: boolean;
}

interface RideView {
  post: RidePost;
  joinedUsers: User[];
}

export function createRideView({
  post,
  joinedUsers,
  currentUser,
  isJoined,
}: CreateRideViewInput): RideView {
  if (!isJoined) {
    return {
      post,
      joinedUsers: [...joinedUsers],
    };
  }

  const joinedUserIds = new Set(post.joinedUserIds);
  joinedUserIds.add(currentUser.id);

  const usersById = new Map(
    [...joinedUsers, currentUser].map((user) => [user.id, user]),
  );

  return {
    post: {
      ...post,
      takenSpots: joinedUserIds.size,
      joinedUserIds: [...joinedUserIds],
    },
    joinedUsers: [...usersById.values()],
  };
}

export function toggleRideMembership(
  joinedRideIds: ReadonlySet<string>,
  post: RidePost,
): Set<string> {
  const isJoined = joinedRideIds.has(post.id);
  const isFull = post.takenSpots >= post.totalSpots;

  if (!isJoined && isFull) {
    return new Set(joinedRideIds);
  }

  return toggleSetValue(joinedRideIds, post.id);
}
