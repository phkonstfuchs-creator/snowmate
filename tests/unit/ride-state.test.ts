import { describe, expect, it } from "vitest";

import {
  createRideView,
  toggleSetValue,
} from "@/features/rides/ride-state";
import type { RidePost, User } from "@/lib/types";

const currentUser: User = {
  id: "me",
  name: "Felix",
  handle: "felix",
  avatar: "FG",
  city: "innsbruck",
  level: 4,
  levelTitle: "Local",
  xp: 1_000,
  xpToNext: 2_000,
  isMinor: false,
  accountType: "standard",
  daysThisSeason: 10,
  resortsVisited: 4,
  friendsInvited: 2,
  streakWeeks: 3,
  badges: [],
  friendIds: [],
};

const ride: RidePost = {
  id: "ride-1",
  authorId: "host",
  resort: "Nordkette",
  city: "innsbruck",
  abilityLevel: "chill",
  date: "Today",
  meetTime: "09:00",
  meetPoint: "Base station",
  totalSpots: 4,
  takenSpots: 1,
  joinedUserIds: ["friend"],
  caption: "",
  postedAt: "now",
};

describe("createRideView", () => {
  it("adds the current user once without mutating the source ride", () => {
    const originalJoinedIds = [...ride.joinedUserIds];

    const result = createRideView({
      post: ride,
      joinedUsers: [],
      currentUser,
      isJoined: true,
    });

    expect(result.post.takenSpots).toBe(2);
    expect(result.post.joinedUserIds).toEqual(["friend", "me"]);
    expect(result.joinedUsers).toEqual([currentUser]);
    expect(ride.takenSpots).toBe(1);
    expect(ride.joinedUserIds).toEqual(originalJoinedIds);
  });

  it("returns the original presentation when the user has not joined", () => {
    const result = createRideView({
      post: ride,
      joinedUsers: [],
      currentUser,
      isJoined: false,
    });

    expect(result).toEqual({ post: ride, joinedUsers: [] });
  });
});

describe("toggleSetValue", () => {
  it("returns a new set and toggles membership", () => {
    const original = new Set(["ride-1"]);
    const result = toggleSetValue(original, "ride-1");

    expect(result).not.toBe(original);
    expect(result.has("ride-1")).toBe(false);
    expect(original.has("ride-1")).toBe(true);
  });
});
