import { describe, expect, it } from "vitest";
import type { RidePost, User } from "@/lib/types";
import {
  canPostPublicRide,
  canSeeMeetingPoint,
  isDiscoverablePublicRide,
  toVisibleRide,
} from "./visibility";

function makeUser(overrides: Partial<User> & Pick<User, "id">): User {
  return {
    name: "Test Person",
    handle: "test.person",
    avatar: "TP",
    city: "innsbruck",
    level: 1,
    levelTitle: "Newbie",
    xp: 0,
    xpToNext: 1000,
    isMinor: false,
    accountType: "standard",
    daysThisSeason: 0,
    resortsVisited: 0,
    friendsInvited: 0,
    streakWeeks: 0,
    badges: [],
    friendIds: [],
    ...overrides,
  };
}

function makePost(overrides: Partial<RidePost> = {}): RidePost {
  return {
    id: "r1",
    authorId: "host",
    resort: "Nordkette",
    city: "innsbruck",
    abilityLevel: "chill",
    date: "Today",
    meetTime: "09:00",
    meetPoint: "Congress Station",
    totalSpots: 4,
    takenSpots: 1,
    joinedUserIds: [],
    caption: "",
    postedAt: "vor 1 Std.",
    visibility: "public",
    ...overrides,
  };
}

const host = makeUser({ id: "host" });
const stranger = makeUser({ id: "stranger" });

describe("canPostPublicRide", () => {
  it("allows adults to open a ride to everyone", () => {
    expect(canPostPublicRide({ isMinor: false })).toBe(true);
  });

  it("blocks minors from broadcasting to strangers", () => {
    expect(canPostPublicRide({ isMinor: true })).toBe(false);
  });
});

describe("isDiscoverablePublicRide", () => {
  it("lists an adult public ride", () => {
    expect(
      isDiscoverablePublicRide({ visibility: "public" }, { isMinor: false }),
    ).toBe(true);
  });

  it("hides a public ride hosted by a minor even if the flag says public", () => {
    expect(
      isDiscoverablePublicRide({ visibility: "public" }, { isMinor: true }),
    ).toBe(false);
  });

  it("keeps friends-only rides out of the public list", () => {
    expect(
      isDiscoverablePublicRide({ visibility: "friends" }, { isMinor: false }),
    ).toBe(false);
  });
});

describe("canSeeMeetingPoint", () => {
  it("always shows the host their own meeting point", () => {
    expect(
      canSeeMeetingPoint({
        viewer: host,
        author: host,
        isJoined: false,
        friendIds: [],
      }),
    ).toBe(true);
  });

  it("unlocks the meeting point after joining", () => {
    expect(
      canSeeMeetingPoint({
        viewer: stranger,
        author: host,
        isJoined: true,
        friendIds: [],
      }),
    ).toBe(true);
  });

  it("keeps the meeting point from a stranger who has not joined", () => {
    expect(
      canSeeMeetingPoint({
        viewer: stranger,
        author: host,
        isJoined: false,
        friendIds: [],
      }),
    ).toBe(false);
  });
});

describe("toVisibleRide", () => {
  it("redacts the meeting point of a public event for strangers", () => {
    const view = toVisibleRide(makePost(), {
      viewer: stranger,
      author: host,
      isJoined: false,
      friendIds: [],
    });

    expect(view.meetPoint).toBeNull();
    expect(view.meetPointLocked).toBe(true);
  });

  it("still shows the area of a public event to everyone", () => {
    const view = toVisibleRide(makePost(), {
      viewer: stranger,
      author: host,
      isJoined: false,
      friendIds: [],
    });

    expect(view.post.resort).toBe("Nordkette");
    expect(view.post.meetTime).toBe("09:00");
  });

  it("never leaks the meeting point through the spread post object", () => {
    const view = toVisibleRide(makePost(), {
      viewer: stranger,
      author: host,
      isJoined: false,
      friendIds: [],
    });

    expect(Object.hasOwn(view.post, "meetPoint")).toBe(false);
  });

  it("reveals the meeting point of a public event once joined", () => {
    const view = toVisibleRide(makePost(), {
      viewer: stranger,
      author: host,
      isJoined: true,
      friendIds: [],
    });

    expect(view.meetPoint).toBe("Congress Station");
    expect(view.meetPointLocked).toBe(false);
  });

  it("does not let friendship alone unlock a public event", () => {
    const view = toVisibleRide(makePost(), {
      viewer: stranger,
      author: host,
      isJoined: false,
      friendIds: ["host"],
    });

    expect(view.meetPoint).toBeNull();
  });

  it("lets friendship unlock a friends-only ride", () => {
    const view = toVisibleRide(makePost({ visibility: "friends" }), {
      viewer: stranger,
      author: host,
      isJoined: false,
      friendIds: ["host"],
    });

    expect(view.meetPoint).toBe("Congress Station");
  });
});
