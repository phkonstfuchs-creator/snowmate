import { describe, expect, it } from "vitest";

import {
  CARPOOL_POSTS,
  CONVERSATIONS,
  CREWS,
  LEADERBOARD_INNSBRUCK,
  LEADERBOARD_SALZBURG,
  MOCK_USERS,
  PUBLIC_EVENTS,
  RIDE_POSTS,
  getUserById,
} from "@/lib/data";

const userIds = new Set(MOCK_USERS.map((user) => user.id));

describe("mock data integrity", () => {
  it("keeps every user reference resolvable", () => {
    const references = [
      ...MOCK_USERS.flatMap((user) => user.friendIds),
      ...[...RIDE_POSTS, ...PUBLIC_EVENTS].flatMap((ride) => [
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

  it("marks every friends-feed ride as friends-only", () => {
    expect(
      RIDE_POSTS.filter((ride) => ride.visibility !== "friends").map((r) => r.id),
    ).toEqual([]);
  });

  /* On large events joinedUserIds is only the visible slice of
     participants, not the complete list. So a range applies here
     rather than the equality used in the friends feed. */
  it("keeps public event capacity within bounds", () => {
    expect(
      PUBLIC_EVENTS.filter(
        (event) =>
          event.joinedUserIds.length > event.takenSpots ||
          event.takenSpots > event.totalSpots,
      ).map((event) => event.id),
    ).toEqual([]);
  });

  it("never lets a minor host a public event", () => {
    expect(
      PUBLIC_EVENTS.filter((event) => getUserById(event.authorId)?.isMinor).map(
        (event) => event.id,
      ),
    ).toEqual([]);
  });

  it("gives every public event a title and a meeting point to withhold", () => {
    expect(
      PUBLIC_EVENTS.filter((event) => !event.title || !event.meetPoint).map(
        (event) => event.id,
      ),
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
