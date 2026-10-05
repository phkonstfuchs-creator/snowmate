import { describe, expect, it } from "vitest";
import { MAX_POST_LENGTH, fitWithin, normalizePostBody, toPost } from "./post";

describe("normalizePostBody", () => {
  it("trims and keeps line breaks and umlauts", () => {
    expect(normalizePostBody("  Powder am Gletscher!\nGeil 🏔️  ")).toBe("Powder am Gletscher!\nGeil 🏔️");
  });

  it("refuses empty, too long and hidden control text", () => {
    expect(normalizePostBody("   ")).toBeNull();
    expect(normalizePostBody("a".repeat(MAX_POST_LENGTH + 1))).toBeNull();
    expect(normalizePostBody("a".repeat(MAX_POST_LENGTH))).not.toBeNull();
    expect(normalizePostBody("hi\u0007")).toBeNull();
    expect(normalizePostBody("abc‮def")).toBeNull();
  });
});

describe("toPost", () => {
  it("maps a row and falls back to the handle for a missing name", () => {
    const post = toPost({
      id: "p1",
      author_id: "u1",
      author_name: null,
      author_handle: "lena_m",
      body: "Hi",
      resort: null,
      has_photo: null,
      created_at: "2026-01-01T10:00:00Z",
      is_mine: true,
    });
    expect(post).toMatchObject({ authorName: "@lena_m", hasPhoto: false, isMine: true });
  });
});

describe("fitWithin", () => {
  it("scales the longest side down and never up", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual([1600, 1200]);
    expect(fitWithin(900, 1800, 1600)).toEqual([800, 1600]);
    expect(fitWithin(800, 600, 1600)).toEqual([800, 600]);
  });
});
