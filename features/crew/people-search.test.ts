import { describe, expect, it } from "vitest";
import type { User } from "@/lib/types";
import {
  countMutualFriends,
  getRequestState,
  normalizeQuery,
  resolveIncomingRequest,
  searchPeople,
  suggestPeople,
  toggleOutgoingRequest,
} from "./people-search";

function makeUser(
  id: string,
  name: string,
  handle: string,
  friendIds: string[] = [],
): User {
  return {
    id,
    name,
    handle,
    avatar: name.slice(0, 2).toUpperCase(),
    city: "innsbruck",
    level: 3,
    levelTitle: "Rookie",
    xp: 100,
    xpToNext: 1000,
    isMinor: false,
    accountType: "standard",
    daysThisSeason: 5,
    resortsVisited: 2,
    friendsInvited: 0,
    streakWeeks: 1,
    badges: [],
    friendIds,
  };
}

const viewer = makeUser("me", "Felix Gruber", "felix.gruber", ["u1"]);
const users: User[] = [
  viewer,
  makeUser("u1", "Sophie Wagner", "sophie.w", ["me", "u2"]),
  makeUser("u2", "Max Huber", "maxhuber", ["u1"]),
  makeUser("u3", "Julia Mayer", "juli.mayer", []),
];

describe("normalizeQuery", () => {
  it("trims, lowercases and drops a leading at sign", () => {
    expect(normalizeQuery("  @Sophie.W ")).toBe("sophie.w");
  });
});

describe("searchPeople", () => {
  it("excludes the viewer and existing friends", () => {
    const ids = searchPeople(users, "", viewer).map((u) => u.id);
    expect(ids).toEqual(["u2", "u3"]);
  });

  it("matches on display name case-insensitively", () => {
    expect(searchPeople(users, "max", viewer).map((u) => u.id)).toEqual(["u2"]);
  });

  it("matches on handle including the at sign form", () => {
    expect(searchPeople(users, "@juli", viewer).map((u) => u.id)).toEqual([
      "u3",
    ]);
  });

  it("returns nothing when the query matches no one", () => {
    expect(searchPeople(users, "zzz", viewer)).toEqual([]);
  });
});

describe("suggestPeople", () => {
  it("only suggests people with at least one mutual friend", () => {
    const ids = suggestPeople(users, viewer).map((entry) => entry.user.id);
    expect(ids).toEqual(["u2"]);
  });

  it("reports the mutual friend count", () => {
    expect(suggestPeople(users, viewer)[0]?.mutualCount).toBe(1);
  });

  it("respects the limit", () => {
    expect(suggestPeople(users, viewer, 0)).toEqual([]);
  });
});

describe("countMutualFriends", () => {
  it("counts overlapping friend ids", () => {
    expect(
      countMutualFriends({ friendIds: ["u1", "u9"] }, { friendIds: ["u1"] }),
    ).toBe(1);
  });
});

describe("request ledger", () => {
  it("defaults to none", () => {
    expect(getRequestState({}, "u2")).toBe("none");
  });

  it("sends and withdraws an outgoing request", () => {
    const sent = toggleOutgoingRequest({}, "u2");
    expect(getRequestState(sent, "u2")).toBe("sent");
    expect(getRequestState(toggleOutgoingRequest(sent, "u2"), "u2")).toBe(
      "none",
    );
  });

  it("does not reopen a decided request by toggling", () => {
    const accepted = resolveIncomingRequest({}, "u2", "accepted");
    expect(toggleOutgoingRequest(accepted, "u2")).toBe(accepted);
  });

  it("records accept and decline decisions", () => {
    expect(getRequestState(resolveIncomingRequest({}, "u3", "declined"), "u3")).toBe(
      "declined",
    );
  });

  it("never mutates the ledger it is given", () => {
    const ledger = {};
    toggleOutgoingRequest(ledger, "u2");
    expect(ledger).toEqual({});
  });
});
