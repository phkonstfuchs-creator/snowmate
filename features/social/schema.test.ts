import { describe, expect, it } from "vitest";
import {
  blockUserSchema,
  createCrewSchema,
  crewInvitationResponseSchema,
  friendshipRequestSchema,
  friendshipResponseSchema,
  inviteCrewMemberSchema,
  unblockUserSchema,
} from "./schema";

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

  it("validates idempotent block and unblock commands", () => {
    expect(
      blockUserSchema.safeParse({ targetId: uuid, idempotencyKey: uuid }).success,
    ).toBe(true);
    expect(
      unblockUserSchema.safeParse({ targetId: uuid, idempotencyKey: uuid })
        .success,
    ).toBe(true);
  });

  it("validates crew creation, invitation, and response commands", () => {
    expect(
      createCrewSchema.safeParse({
        name: "  Weekend Crew  ",
        city: "innsbruck",
        idempotencyKey: uuid,
      }).success,
    ).toBe(true);
    expect(
      inviteCrewMemberSchema.safeParse({
        crewId: uuid,
        targetId: uuid,
        idempotencyKey: uuid,
      }).success,
    ).toBe(true);
    expect(
      crewInvitationResponseSchema.safeParse({
        invitationId: uuid,
        accept: true,
        idempotencyKey: uuid,
      }).success,
    ).toBe(true);
  });
});
