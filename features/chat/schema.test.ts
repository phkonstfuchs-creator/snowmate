import { describe, expect, it } from "vitest";
import { sendMessageSchema } from "./schema";

const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("chat message schema", () => {
  it("normalizes a plain-text message", () => {
    expect(
      sendMessageSchema.parse({
        conversationId: uuid,
        text: "  Bis morgen am Lift  ",
        idempotencyKey: uuid,
      }).text,
    ).toBe("Bis morgen am Lift");
  });

  it("rejects empty, oversized, control, and bidi text", () => {
    for (const text of ["   ", "a".repeat(1001), "hello\u0000", "hello\u202e"]) {
      expect(
        sendMessageSchema.safeParse({
          conversationId: uuid,
          text,
          idempotencyKey: uuid,
        }).success,
      ).toBe(false);
    }
  });
});
