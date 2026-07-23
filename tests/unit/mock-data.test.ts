import { describe, expect, it } from "vitest";

import {
  CARPOOL_POSTS,
  CONVERSATIONS,
  CREWS,
  MOCK_USERS,
  RIDE_POSTS,
} from "@/lib/data";

const userIds = new Set(MOCK_USERS.map((user) => user.id));

describe("mock data integrity", () => {
  it("keeps every user reference resolvable", () => {
    const references = [
      ...MOCK_USERS.flatMap((user) => user.friendIds),
      ...RIDE_POSTS.flatMap((ride) => [
        ride.authorId,
        ...ride.joinedUserIds,
      ]),
      ...CARPOOL_POSTS.flatMap((post) => [
        post.authorId,
        ...post.riders,
      ]),
      ...CREWS.flatMap((crew) => crew.memberIds),
      ...CONVERSATIONS.flatMap((conversation) => [
        ...conversation.participantIds,
        ...conversation.messages.map((message) => message.senderId),
      ]),
    ];

    expect(references.filter((id) => !userIds.has(id))).toEqual([]);
  });

  it("keeps denormalized ride counts aligned with member references", () => {
    expect(
      RIDE_POSTS.map((ride) => ({
        id: ride.id,
        expected: ride.joinedUserIds.length,
        actual: ride.takenSpots,
      })).filter(({ expected, actual }) => expected !== actual),
    ).toEqual([]);
  });
});
