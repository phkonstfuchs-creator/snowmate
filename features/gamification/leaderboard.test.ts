import { describe, expect, it } from "vitest";
import { formatMetric, isMetric, isScope, toLeaderboardRow } from "./leaderboard";

describe("leaderboard rows", () => {
  it("never shows anything identifying for an anonymous rider", () => {
    expect(toLeaderboardRow({ rank: 1, user_id: "u", display_name: "Kid", handle: "kid", value: "5000", is_me: false, anonymous: true }))
      .toEqual({ rank: 1, userId: null, name: null, handle: null, value: 5000, isMe: false, anonymous: true });
  });

  it("maps a named row and falls back to the handle", () => {
    expect(toLeaderboardRow({ rank: 2, user_id: "u", display_name: null, handle: "lena_m", value: 87.5, is_me: true, anonymous: false }))
      .toMatchObject({ name: "@lena_m", isMe: true, value: 87.5 });
  });

  it("validates scope and metric", () => {
    expect(isScope("region")).toBe(true);
    expect(isScope("world")).toBe(false);
    expect(isMetric("speed")).toBe(true);
    expect(isMetric("xp")).toBe(false);
  });

  it("formats values per metric", () => {
    expect(formatMetric("distance", 42_400, "de-AT")).toBe("42");
    expect(formatMetric("distance", 4_250, "de-AT")).toBe("4,3");
    expect(formatMetric("vertical", 12_500, "en-GB")).toBe("12,500");
  });
});
