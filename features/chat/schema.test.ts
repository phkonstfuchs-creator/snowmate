import { describe, expect, it } from "vitest";
import {
  createAppealSchema,
  createDmSchema,
  createReportSchema,
  sendMessageSchema,
} from "./schema";

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

  it("requires idempotency for DM creation and rejects client identity fields", () => {
    expect(
      createDmSchema.safeParse({ targetUserId: uuid, idempotencyKey: uuid })
        .success,
    ).toBe(true);
    expect(
      createDmSchema.safeParse({
        targetUserId: uuid,
        idempotencyKey: uuid,
        userId: uuid,
      }).success,
    ).toBe(false);
  });

  it("validates report context and requires details for the other reason", () => {
    expect(
      createReportSchema.safeParse({
        targetUserId: uuid,
        reasonCode: "harassment",
        details: "  Wiederholte Beleidigungen  ",
        messageId: uuid,
        idempotencyKey: uuid,
      }).success,
    ).toBe(true);
    expect(
      createReportSchema.safeParse({
        targetUserId: uuid,
        reasonCode: "other",
        details: "kurz",
        idempotencyKey: uuid,
      }).success,
    ).toBe(false);
  });

  it("requires a meaningful appeal reason", () => {
    expect(
      createAppealSchema.safeParse({
        reportId: uuid,
        text: "Bitte prüft diese Entscheidung erneut.",
        idempotencyKey: uuid,
      }).success,
    ).toBe(true);
    expect(
      createAppealSchema.safeParse({
        reportId: uuid,
        text: "zu kurz",
        idempotencyKey: uuid,
      }).success,
    ).toBe(false);
  });
});
