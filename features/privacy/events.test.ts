import { describe, expect, it } from "vitest";
import { createAnalyticsEvent } from "./events";

describe("analytics event policy", () => {
  it("accepts only allowlisted event names, keys, and enum values", () => {
    expect(
      createAnalyticsEvent("privacy_settings_viewed", { source: "direct" }),
    ).toEqual({
      event: "privacy_settings_viewed",
      properties: { source: "direct" },
    });

    expect(createAnalyticsEvent("ride_message_sent", {})).toBeNull();
    expect(
      createAnalyticsEvent("privacy_settings_viewed", { source: "campaign" }),
    ).toBeNull();
    expect(
      createAnalyticsEvent("privacy_settings_viewed", {
        source: "direct",
        extra: true,
      }),
    ).toBeNull();
  });

  it.each([
    "email",
    "name",
    "display_name",
    "text",
    "messageText",
    "friend_ids",
    "socialGraph",
    "latitude",
    "longitude",
    "coordinates",
    "location",
  ])("rejects sensitive payload key %s", (key) => {
    expect(
      createAnalyticsEvent("privacy_settings_viewed", {
        source: "direct",
        [key]: "sensitive",
      }),
    ).toBeNull();
  });

  it("rejects nested payloads so text cannot hide below an allowed key", () => {
    expect(
      createAnalyticsEvent("privacy_settings_viewed", {
        source: { text: "secret" },
      }),
    ).toBeNull();
  });
});
