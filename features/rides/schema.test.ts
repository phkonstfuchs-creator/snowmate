import { describe, expect, it } from "vitest";
import { createCarpoolInputSchema, createRideInputSchema } from "./schema";

const now = new Date("2026-08-03T10:00:00.000Z");
const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("ride command schemas", () => {
  it("accepts a bounded future ride and trims text", () => {
    const result = createRideInputSchema(now).parse({
      resortId: "stubai-glacier",
      abilityLevel: "chill",
      startsAt: "2026-08-04T08:00:00.000Z",
      capacity: 4,
      audience: "friends-of-friends",
      caption: "  First lift  ",
      meetingPoint: "  Talstation  ",
      idempotencyKey: uuid,
    });

    expect(result.caption).toBe("First lift");
    expect(result.meetingPoint).toBe("Talstation");
  });

  it("rejects past rides, oversized capacity, and control characters", () => {
    const result = createRideInputSchema(now).safeParse({
      resortId: "stubai-glacier",
      abilityLevel: "park",
      startsAt: "2026-08-02T08:00:00.000Z",
      capacity: 50,
      audience: "friends",
      caption: "unsafe\ncaption",
      meetingPoint: "Talstation",
      idempotencyKey: uuid,
    });

    expect(result.success).toBe(false);
  });

  it("keeps exact departure data separate from broad carpool data", () => {
    const result = createCarpoolInputSchema(now).parse({
      resortId: "nordkette",
      city: "innsbruck",
      role: "driver",
      departureAt: "2026-08-04T06:30:00.000Z",
      totalSeats: 3,
      audience: "friends",
      note: "  Ski bag fits  ",
      departurePoint: "  Hauptbahnhof  ",
      idempotencyKey: uuid,
    });

    expect(result.note).toBe("Ski bag fits");
    expect(result.departurePoint).toBe("Hauptbahnhof");
  });
});
