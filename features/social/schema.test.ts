import { describe, expect, it } from "vitest";
import { friendshipRequestSchema, friendshipResponseSchema } from "./schema";

const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("social command schemas", () => {
  it("normalizes an optional targeted invite", () => {
    expect(
      friendshipRequestSchema.parse({
        targetId: uuid,
        idempotencyKey: uuid,
        inviteToken: "A".repeat(64),
      }),
    ).toEqual({
      targetId: uuid,
      idempotencyKey: uuid,
      inviteToken: "a".repeat(64),
    });
  });

  it("rejects malformed ids and low-entropy invite tokens", () => {
    expect(
      friendshipRequestSchema.safeParse({
        targetId: "me",
        idempotencyKey: uuid,
        inviteToken: "short",
      }).success,
    ).toBe(false);
  });

  it("requires an explicit boolean response", () => {
    expect(
      friendshipResponseSchema.safeParse({
        friendshipId: uuid,
        accept: "yes",
        idempotencyKey: uuid,
      }).success,
    ).toBe(false);
  });
});
