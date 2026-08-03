import { describe, expect, it } from "vitest";
import {
  createLocationUpdateSchema,
  startLocationSessionSchema,
} from "./schema";

const now = new Date("2026-08-03T10:00:00.000Z");
const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("location command schemas", () => {
  it("accepts a short, explicit foreground session", () => {
    expect(
      startLocationSessionSchema.parse({
        resortId: "stubai-glacier",
        audience: "ride",
        rideId: uuid,
        durationHours: 4,
        idempotencyKey: uuid,
      }).durationHours,
    ).toBe(4);
  });

  it("rejects sessions over eight hours", () => {
    expect(
      startLocationSessionSchema.safeParse({
        resortId: "stubai-glacier",
        audience: "friends",
        durationHours: 9,
        idempotencyKey: uuid,
      }).success,
    ).toBe(false);
  });

  it("accepts a fresh coordinate update", () => {
    expect(
      createLocationUpdateSchema(now).safeParse({
        sessionId: uuid,
        latitude: 47.011,
        longitude: 11.302,
        accuracyMeters: 25,
        capturedAt: "2026-08-03T09:59:30.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects stale, future, impossible, and inaccurate coordinates", () => {
    const invalidUpdates = [
      { latitude: 47, longitude: 11, accuracyMeters: 20, capturedAt: "2026-08-03T09:57:00.000Z" },
      { latitude: 47, longitude: 11, accuracyMeters: 20, capturedAt: "2026-08-03T10:01:00.000Z" },
      { latitude: 91, longitude: 11, accuracyMeters: 20, capturedAt: "2026-08-03T09:59:30.000Z" },
      { latitude: 47, longitude: 11, accuracyMeters: 1001, capturedAt: "2026-08-03T09:59:30.000Z" },
    ];

    for (const update of invalidUpdates) {
      expect(
        createLocationUpdateSchema(now).safeParse({ sessionId: uuid, ...update })
          .success,
      ).toBe(false);
    }
  });
});
