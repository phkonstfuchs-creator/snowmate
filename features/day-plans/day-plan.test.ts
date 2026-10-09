import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDayPlans, validateDayPlanInput } from "./day-plan";

const NOW = new Date("2026-10-09T10:00:00.000Z");
const valid = {
  city: "innsbruck",
  resort: "Stubai Glacier",
  planDate: "2026-10-10",
  meetTime: "09:15",
  transport: "need",
  meetingText: "Innsbruck Hbf",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("validateDayPlanInput", () => {
  it("accepts covered resort plans inside the Vienna 365-day window", () => {
    expect(validateDayPlanInput(valid, NOW)).toMatchObject({ success: true, data: valid });
  });

  it.each([
    [{ city: "salzburg" }, "v.pickResort"],
    [{ resort: "not covered" }, "v.pickResort"],
    [{ planDate: "2026-10-08" }, "v.dateWithinYear"],
    [{ planDate: "2027-10-10" }, "v.dateWithinYear"],
    [{ planDate: "2026-02-30" }, "v.pickDate"],
    [{ meetTime: "9:15" }, "v.pickTime"],
    [{ transport: "maybe" }, "v.checkDetails"],
    [{ meetingText: "x" }, "v.addMeetPoint"],
    [{ meetingText: "x".repeat(121) }, "v.max|120"],
    [{ meetingText: "hidden\u202e text" }, "v.checkDetails"],
    [{ meetingText: "control\u0007" }, "v.checkDetails"],
  ])("rejects invalid input patch %j", (patch, message) => {
    expect(validateDayPlanInput({ ...valid, ...patch }, NOW)).toEqual({ success: false, message });
  });

  it("does not silently trim or rewrite user text", () => {
    expect(validateDayPlanInput({ ...valid, meetingText: "  Hbf  " }, NOW)).toEqual({
      success: false,
      message: "v.checkDetails",
    });
  });
});

describe("parseDayPlans", () => {
  const plan = {
    id: "8c2af272-90ac-4ef9-81ee-434fb8f18001",
    version: 2,
    city: "innsbruck",
    resort: "Stubai Glacier",
    planDate: "2026-10-10",
    meetTime: "09:15",
    transport: "need",
    meetingText: "Innsbruck Hbf",
    createdAt: "2026-10-09T10:00:00.000Z",
    updatedAt: "2026-10-09T10:00:00.000Z",
    expiresAt: "2026-10-11T22:00:00.000Z",
  };

  it("accepts a well-formed own-plan RPC envelope", () => {
    expect(parseDayPlans({ status: "ok", plans: [plan] })).toEqual({ status: "ok", plans: [plan] });
  });

  it("preserves backend unavailability as a distinct state", () => {
    expect(parseDayPlans({ status: "unavailable" })).toEqual({ status: "unavailable" });
  });

  it.each([
    null,
    {},
    { status: "ok", plans: [{ ...plan, userId: "owner" }] },
    { status: "ok", plans: [{ ...plan, meetingText: "hidden\u2066text" }] },
    { status: "ok", plans: [{ ...plan, version: 0 }] },
    { status: "ok", plans: Array.from({ length: 21 }, (_, i) => ({ ...plan, id: `${i}` })) },
  ])("fails closed on malformed RPC data", (value) => {
    expect(parseDayPlans(value)).toEqual({ status: "unavailable" });
  });
});
