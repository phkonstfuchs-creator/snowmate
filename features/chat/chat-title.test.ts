import { describe, expect, it } from "vitest";
import { translator } from "@/lib/i18n/translate";
import { chatTitle } from "./chat-title";
import type { ChatSummary } from "./message";

const base: ChatSummary = {
  id: "c", kind: "direct", otherUserId: "u", otherName: "Lena Moser", otherHandle: "lena_m",
  rideId: null, rideResort: null, rideDate: null, lastBody: null, lastAt: null, lastIsMine: false, unread: 0,
};
const t = translator("en");

describe("chatTitle", () => {
  it("names a direct chat after the other person", () => {
    expect(chatTitle(base, t, "en")).toEqual({ title: "Lena Moser", subtitle: "@lena_m" });
    expect(chatTitle({ ...base, otherName: null }, t, "en").title).toBe("@lena_m");
    expect(chatTitle({ ...base, otherName: null, otherHandle: null }, t, "en")).toEqual({ title: "Rider", subtitle: undefined });
  });

  it("names a ride chat after the resort and day", () => {
    const ride = { ...base, kind: "ride" as const, rideResort: "Nordkette", rideDate: "2026-12-05" };
    expect(chatTitle(ride, t, "en")).toEqual({ title: "Nordkette", subtitle: "Ride chat · Sat 5 Dec" });
    expect(chatTitle({ ...ride, rideResort: null, rideDate: null }, t, "en")).toEqual({ title: "Ride chat", subtitle: "Ride chat" });
  });
});
