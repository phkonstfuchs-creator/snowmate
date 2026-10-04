import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it.each([null, undefined, "", "https://evil.example", "//evil.example", "/feed/../admin", "/admin"])(
    "falls back to the feed for %s",
    (value) => expect(safeNextPath(value)).toBe("/feed"),
  );
  it.each(["/feed", "/reset-password", "/profile"])("keeps %s", (value) => expect(safeNextPath(value)).toBe(value));
});
