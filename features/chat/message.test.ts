import { describe, expect, it } from "vitest";
import { isUuid, mergeMessages, normalizeMessage, toChatMessage, toChatSummary, type ChatMessage } from "./message";

const msg = (id: string, createdAt: string): ChatMessage => ({ id, senderId: "s", senderName: "S", body: id, createdAt, isMine: false, kind: "text", position: null });

describe("chat messages", () => {
  it("trims and accepts ordinary text, line breaks included", () => {
    expect(normalizeMessage("  Servus!  ")).toBe("Servus!");
    expect(normalizeMessage("two\nlines")).toBe("two\nlines");
    expect(normalizeMessage("ä".repeat(1000))).toHaveLength(1000);
  });

  it.each([["", "empty"], ["   \n ", "blank"], ["a".repeat(1001), "too long"], ["bell\u0007", "control"], ["tab\there", "tab"], ["x‮y", "bidi"]])(
    "refuses %j (%s)",
    (text) => {
      expect(normalizeMessage(text)).toBeNull();
    },
  );

  it("recognises ids", () => {
    expect(isUuid("c4a70000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUuid("../crew")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it("maps location rows, and hides a pin without coordinates", () => {
    const row = { id: "1", sender_id: "u", sender_name: "Lena", sender_handle: "lena", body: "📍", created_at: "t", is_mine: false };
    expect(toChatMessage({ ...row, kind: "location", lat: 47.1, lng: 11.2 })).toMatchObject({ kind: "location", position: { lat: 47.1, lng: 11.2 } });
    expect(toChatMessage({ ...row, kind: "location", lat: null, lng: null })).toMatchObject({ kind: "location", position: null });
    expect(toChatMessage({ ...row, kind: "text", lat: 47.1, lng: 11.2 })).toMatchObject({ kind: "text", position: null });
    expect(toChatMessage(row)).toMatchObject({ kind: "text", position: null });
  });

  it("maps rows from the database", () => {
    expect(toChatMessage({ id: "1", sender_id: "u", sender_name: null, sender_handle: "lena", body: "hi", created_at: "t", is_mine: false }))
      .toMatchObject({ senderName: "@lena", isMine: false });
    expect(toChatMessage({ id: "1", sender_id: "u", sender_name: null, sender_handle: null, body: "hi", created_at: "t", is_mine: true }).senderName).toBe("Rider");

    const summary = toChatSummary({
      conversation_id: "c", kind: "ride", other_user_id: null, other_name: null, other_handle: null,
      ride_id: "r", ride_resort: "Nordkette", ride_date: "2026-12-01", last_body: null, last_at: null, last_is_mine: null, unread: -3,
    });
    expect(summary).toMatchObject({ kind: "ride", unread: 0, lastIsMine: false });
    expect(toChatSummary({ ...{ conversation_id: "c", kind: "x", other_user_id: "o", other_name: "O", other_handle: "o", ride_id: null, ride_resort: null, ride_date: null, last_body: "b", last_at: "t", last_is_mine: true, unread: 2 } }).kind).toBe("direct");
  });

  it("merges polled messages without duplicates, oldest first", () => {
    const current = [msg("a", "2026-01-01T10:00:00Z"), msg("b", "2026-01-01T10:01:00Z")];
    expect(mergeMessages(current, [])).toBe(current);
    expect(mergeMessages(current, [msg("b", "2026-01-01T10:01:00Z")])).toBe(current);
    expect(mergeMessages(current, [msg("c", "2026-01-01T10:02:00Z")]).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});
