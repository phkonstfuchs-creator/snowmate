import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  isShareMinutes,
  isValidPosition,
  minutesSince,
  shouldSendUpdate,
  toFriendLocation,
} from "./location";

describe("location rules", () => {
  it("validates positions", () => {
    expect(isValidPosition({ lat: 47.26, lng: 11.39, accuracy: 12 })).toBe(true);
    expect(isValidPosition({ lat: 47.26, lng: 11.39, accuracy: null })).toBe(true);
    expect(isValidPosition({ lat: 91, lng: 11, accuracy: 1 })).toBe(false);
    expect(isValidPosition({ lat: 47, lng: Number.NaN, accuracy: 1 })).toBe(false);
    expect(isValidPosition({ lat: "47", lng: 11 })).toBe(false);
    expect(isValidPosition({ lat: 47, lng: 11, accuracy: -1 })).toBe(false);
    expect(isValidPosition(null)).toBe(false);
  });

  it("only allows the offered durations", () => {
    expect(isShareMinutes(60)).toBe(true);
    expect(isShareMinutes(720)).toBe(true);
    expect(isShareMinutes(5000)).toBe(false);
    expect(isShareMinutes("60")).toBe(false);
  });

  it("measures distances", () => {
    // Innsbruck Hbf to the Nordkettenbahn valley station, roughly 1.2 km.
    const d = distanceMeters({ lat: 47.2632, lng: 11.4009 }, { lat: 47.2694, lng: 11.3936 });
    expect(d).toBeGreaterThan(800);
    expect(d).toBeLessThan(1200);
  });

  it("sends updates only after moving or waiting", () => {
    const here = { lat: 47.26, lng: 11.39, accuracy: 10 };
    const near = { lat: 47.26005, lng: 11.39, accuracy: 10 }; // ~5 m
    const far = { lat: 47.261, lng: 11.39, accuracy: 10 }; // ~110 m
    expect(shouldSendUpdate(null, here, 0)).toBe(true);
    expect(shouldSendUpdate({ position: here, at: 0 }, far, 10_000)).toBe(false);
    expect(shouldSendUpdate({ position: here, at: 0 }, far, 20_000)).toBe(true);
    expect(shouldSendUpdate({ position: here, at: 0 }, near, 30_000)).toBe(false);
    expect(shouldSendUpdate({ position: here, at: 0 }, near, 61_000)).toBe(true);
  });

  it("maps rows and ages", () => {
    expect(toFriendLocation({ user_id: "u", display_name: null, handle: "h", lat: 1, lng: 2, accuracy_m: 5, updated_at: "2026-01-01T10:00:00Z" }))
      .toEqual({ userId: "u", name: "h", handle: "h", lat: 1, lng: 2, accuracy: 5, updatedAt: "2026-01-01T10:00:00Z" });
    expect(minutesSince("2026-01-01T10:00:00Z", new Date("2026-01-01T10:07:20Z"))).toBe(7);
    expect(minutesSince("2026-01-01T10:10:00Z", new Date("2026-01-01T10:07:20Z"))).toBe(0);
  });
});
