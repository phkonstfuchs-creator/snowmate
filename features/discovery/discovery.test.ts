import { describe, expect, it } from "vitest";
import { SWIPE_THRESHOLD, swipeDirection, toDeckCard } from "./discovery";

describe("discovery", () => {
  it("maps a deck row with safe defaults", () => {
    expect(toDeckCard({ user_id: "u", display_name: null, ability_level: "park", riding_styles: null, bio: null, mutual_friends: null }))
      .toEqual({ userId: "u", name: "Rider", abilityLevel: "park", ridingStyles: [], bio: null, mutualFriends: 0 });
  });

  it("turns a drag into a decision only past the threshold", () => {
    expect(swipeDirection(SWIPE_THRESHOLD)).toBe("like");
    expect(swipeDirection(-SWIPE_THRESHOLD - 1)).toBe("pass");
    expect(swipeDirection(SWIPE_THRESHOLD - 1)).toBeNull();
    expect(swipeDirection(0)).toBeNull();
  });
});
