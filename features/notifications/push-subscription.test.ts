import { describe, expect, it } from "vitest";
import { applicationServerKey, toSubscriptionInput } from "./push-subscription";

const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };

describe("toSubscriptionInput", () => {
  it("accepts the browser push services", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://web.push.apple.com/QGx",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
      "https://wns2-par02p.notify.windows.com/w/?token=BQYA",
    ]) {
      expect(toSubscriptionInput({ endpoint, keys })).toEqual({ endpoint, ...keys });
    }
  });

  it("refuses any other host and malformed keys", () => {
    expect(toSubscriptionInput({ endpoint: "https://evil.example.com/x", keys })).toBeNull();
    expect(toSubscriptionInput({ endpoint: "https://fcm.googleapis.com.evil.com/x", keys })).toBeNull();
    expect(toSubscriptionInput({ endpoint: "http://fcm.googleapis.com/x", keys })).toBeNull();
    expect(toSubscriptionInput({ endpoint: "https://web.push.apple.com/x", keys: { ...keys, auth: "short" } })).toBeNull();
    expect(toSubscriptionInput(null)).toBeNull();
  });
});

describe("applicationServerKey", () => {
  it("decodes base64url", () => {
    expect([...applicationServerKey("AQID_-8")]).toEqual([1, 2, 3, 255, 239]);
  });
});
