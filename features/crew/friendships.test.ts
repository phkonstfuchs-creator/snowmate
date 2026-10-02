import { describe, expect, it } from "vitest";
import { groupFriendships, type FriendshipRow } from "./friendships";

const base: FriendshipRow = {
  user_id: "u",
  display_name: "Max",
  handle: "max",
  city: "innsbruck",
  ability_level: "chill",
  status: "accepted",
  direction: "outgoing",
};

describe("groupFriendships", () => {
  it("splits friends, incoming and outgoing requests", () => {
    const graph = groupFriendships([
      { ...base, user_id: "a" },
      { ...base, user_id: "b", status: "pending", direction: "incoming" },
      { ...base, user_id: "c", status: "pending", direction: "outgoing" },
      { ...base, user_id: "d", direction: "incoming" },
    ]);

    expect(graph.friends.map((r) => r.user_id)).toEqual(["a", "d"]);
    expect(graph.incoming.map((r) => r.user_id)).toEqual(["b"]);
    expect(graph.outgoing.map((r) => r.user_id)).toEqual(["c"]);
  });
});
