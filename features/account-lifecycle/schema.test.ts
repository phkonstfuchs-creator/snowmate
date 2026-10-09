import { describe, expect, it } from "vitest";
import {
  accountDeletionRequestSchema,
  exportRequestSchema,
} from "./schema";

describe("account lifecycle schemas", () => {
  it("accepts a strict export command", () => {
    expect(
      exportRequestSchema.parse({
        idempotencyKey: "10000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({
      idempotencyKey: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("requires the exact destructive deletion confirmation", () => {
    expect(
      accountDeletionRequestSchema.safeParse({
        confirmation: "delete",
        idempotencyKey: "10000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(false);

    expect(
      accountDeletionRequestSchema.parse({
        confirmation: "DELETE",
        idempotencyKey: "10000000-0000-4000-8000-000000000002",
      }),
    ).toEqual({
      confirmation: "DELETE",
      idempotencyKey: "10000000-0000-4000-8000-000000000002",
    });
  });

  it("rejects every client-supplied identity field", () => {
    expect(
      accountDeletionRequestSchema.safeParse({
        confirmation: "DELETE",
        analyticsId: "20000000-0000-4000-8000-000000000001",
        idempotencyKey: "10000000-0000-4000-8000-000000000002",
        userId: "forged",
      }).success,
    ).toBe(false);
  });
});
