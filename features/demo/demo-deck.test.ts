import { describe, expect, it } from "vitest";
import { ME, MOCK_USERS } from "@/lib/data";
import { demoDeck } from "./demo-deck";

describe("demoDeck", () => {
  it("follows the live rules: no friends, no minors for an adult, same region only", () => {
    const deck = demoDeck(ME, MOCK_USERS);
    expect(deck.length).toBeGreaterThan(0);
    for (const card of deck) {
      const user = MOCK_USERS.find((candidate) => candidate.id === card.userId)!;
      expect(ME.friendIds).not.toContain(user.id);
      expect(user.isMinor).toBe(ME.isMinor);
      expect(user.city).toBe(ME.city);
      expect(user.id).not.toBe(ME.id);
    }
  });
});
