import { describe, expect, it } from "vitest";
import { settle } from "./settle";

describe("settle", () => {
  it("passes a result through and turns a rejection into the fallback", async () => {
    await expect(settle(Promise.resolve(1), 0)).resolves.toBe(1);
    await expect(settle(Promise.reject(new Error("offline")), 0)).resolves.toBe(0);
  });
});
