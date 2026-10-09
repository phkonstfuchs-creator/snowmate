import { beforeEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_ID_STORAGE_KEY,
  CONSENT_STORAGE_KEY,
  DEFAULT_CONSENT,
  readAnalyticsId,
  readConsent,
  writeAnalyticsConsent,
} from "./consent";

describe("privacy consent persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("fails closed when no valid decision exists", () => {
    expect(readConsent(localStorage)).toEqual(DEFAULT_CONSENT);

    localStorage.setItem(CONSENT_STORAGE_KEY, "not-json");
    expect(readConsent(localStorage)).toEqual(DEFAULT_CONSENT);

    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        necessary: false,
        analytics: "granted",
        updatedAt: "2026-08-03T12:00:00.000Z",
      }),
    );
    expect(readConsent(localStorage)).toEqual(DEFAULT_CONSENT);
  });

  it("keeps necessary processing enabled for every decision", () => {
    const granted = writeAnalyticsConsent(localStorage, true, {
      now: () => new Date("2026-08-03T12:00:00.000Z"),
      analyticsId: "9fc1a0dc-b151-4df2-86cb-f3015badf019",
    });

    expect(granted).toEqual({
      version: 2,
      necessary: true,
      analytics: "granted",
      updatedAt: "2026-08-03T12:00:00.000Z",
    });
    expect(readConsent(localStorage).necessary).toBe(true);
  });

  it("persists only the server-bound pseudonymous id after opt-in", () => {
    expect(readAnalyticsId(localStorage)).toBeNull();

    writeAnalyticsConsent(localStorage, true, {
      now: () => new Date("2026-08-03T12:00:00.000Z"),
      analyticsId: "9fc1a0dc-b151-4df2-86cb-f3015badf019",
    });

    expect(readAnalyticsId(localStorage)).toBe(
      "9fc1a0dc-b151-4df2-86cb-f3015badf019",
    );
  });

  it("fails closed without a valid server-bound analytics id", () => {
    expect(writeAnalyticsConsent(localStorage, true)).toBeNull();
    expect(readAnalyticsId(localStorage)).toBeNull();
    expect(
      writeAnalyticsConsent(localStorage, true, {
        analyticsId: "client-forged-id",
      }),
    ).toBeNull();
    expect(readConsent(localStorage)).toEqual(DEFAULT_CONSENT);
    expect(readAnalyticsId(localStorage)).toBeNull();
  });

  it("withdraws analytics consent and removes the pseudonymous id", () => {
    localStorage.setItem(
      ANALYTICS_ID_STORAGE_KEY,
      "9fc1a0dc-b151-4df2-86cb-f3015badf019",
    );

    const denied = writeAnalyticsConsent(localStorage, false, {
      now: () => new Date("2026-08-03T13:00:00.000Z"),
    });

    expect(denied?.analytics).toBe("denied");
    expect(denied?.necessary).toBe(true);
    expect(readAnalyticsId(localStorage)).toBeNull();
  });

  it("removes every old grant when storage cannot persist withdrawal", () => {
    const values = new Map<string, string>([
      [
        CONSENT_STORAGE_KEY,
        JSON.stringify({
          version: 2,
          necessary: true,
          analytics: "granted",
          updatedAt: "2026-08-03T12:00:00.000Z",
        }),
      ],
      [ANALYTICS_ID_STORAGE_KEY, "00000000-0000-4000-8000-000000000001"],
    ]);
    const failingStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => { values.delete(key); },
      setItem: () => { throw new Error("storage is full"); },
    };

    expect(writeAnalyticsConsent(failingStorage, false)).toBeNull();
    expect(readConsent(failingStorage)).toEqual(DEFAULT_CONSENT);
    expect(readAnalyticsId(failingStorage)).toBeNull();
  });
});
