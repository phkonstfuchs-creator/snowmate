import { describe, expect, it } from "vitest";

import {
  CARPOOL_POSTS,
  CONVERSATIONS,
  CREWS,
  LEADERBOARD_INNSBRUCK,
  LEADERBOARD_SALZBURG,
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

  it("keeps denormalized carpool capacity aligned with rider references", () => {
    expect(
      CARPOOL_POSTS.map((post) => ({
        id: post.id,
        expected: post.totalSeats - post.riders.length,
        actual: post.availableSeats,
      })).filter(({ expected, actual }) => expected !== actual),
    ).toEqual([]);
  });

  it.each([
    ["Innsbruck", LEADERBOARD_INNSBRUCK],
    ["Salzburg", LEADERBOARD_SALZBURG],
  ])("keeps the %s leaderboard ranked by XP", (_, leaderboard) => {
    expect(
      leaderboard.map((entry, index) => ({
        rank: entry.rank,
        expectedRank: index + 1,
        xp: entry.xp,
        previousXp: leaderboard[index - 1]?.xp ?? Number.POSITIVE_INFINITY,
      })).filter(
        ({ rank, expectedRank, xp, previousXp }) =>
          rank !== expectedRank || xp > previousXp,
      ),
    ).toEqual([]);
  });
});
