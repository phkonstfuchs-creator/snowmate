import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLiftMeetups } from "./useLiftMeetups";
import type { LiftMeetup } from "./meetup";

vi.mock("./actions", () => ({
  friendLiftMeetupsAction: vi.fn(),
  myLiftMeetupAction: vi.fn(),
  startLiftMeetupAction: vi.fn(),
  stopLiftMeetupAction: vi.fn(),
}));

afterEach(() => vi.useRealTimers());

describe("useLiftMeetups", () => {
  it("removes a friend's status at expiry without waiting for a network poll", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
    const friend: LiftMeetup = {
      userId: "friend", name: "Lena", handle: null, resort: "Nordkette", liftId: "lift",
      startedAt: "2026-10-06T09:30:00Z", arrivalAt: "2026-10-06T10:05:00Z", expiresAt: "2026-10-06T10:00:00.500Z",
    };
    const { result } = renderHook(() => useLiftMeetups(null, [friend]));
    expect(result.current.friends).toHaveLength(1);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.friends).toEqual([]);
  });
});
