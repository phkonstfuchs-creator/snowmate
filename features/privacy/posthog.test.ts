import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPostHogAnalytics,
  readPostHogConfig,
  type PostHogBrowserApi,
  type PostHogConfig,
} from "./posthog";
import {
  readAnalyticsId,
  readConsent,
  writeAnalyticsConsent,
} from "./consent";

const config: PostHogConfig = {
  projectKey: "phc_test_project_key",
  apiHost: "https://eu.i.posthog.com",
  assetHost: "https://eu-assets.i.posthog.com",
};

function setPostHogApi(api: PostHogBrowserApi | undefined) {
  const target = window as typeof window & { posthog?: PostHogBrowserApi };

  if (api) {
    target.posthog = api;
  } else {
    delete target.posthog;
  }
}

describe("consent-bound PostHog analytics", () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = "";
    setPostHogApi(undefined);
  });

  it("does not load a script or call PostHog before opt-in", () => {
    const api: PostHogBrowserApi = {
      init: vi.fn(),
      capture: vi.fn(),
      opt_out_capturing: vi.fn(),
      reset: vi.fn(),
    };
    setPostHogApi(api);

    const analytics = createPostHogAnalytics({
      config,
      storage: localStorage,
      document,
      window,
    });

    expect(analytics.sync()).toBe(false);
    expect(analytics.capture("privacy_settings_viewed", { source: "direct" })).toBe(false);
    expect(document.querySelector("script[data-snowmate-posthog]")).toBeNull();
    expect(api.init).not.toHaveBeenCalled();
    expect(api.capture).not.toHaveBeenCalled();
  });

  it("stays network-inert without complete EU environment config", () => {
    writeAnalyticsConsent(localStorage, true, {
      analyticsId: "9fc1a0dc-b151-4df2-86cb-f3015badf019",
    });
    const analytics = createPostHogAnalytics({
      config: null,
      storage: localStorage,
      document,
      window,
    });

    expect(analytics.sync()).toBe(false);
    expect(document.querySelector("script[data-snowmate-posthog]")).toBeNull();
  });

  it("uses an already loaded SDK without injecting another script", () => {
    writeAnalyticsConsent(localStorage, true, {
      analyticsId: "9fc1a0dc-b151-4df2-86cb-f3015badf019",
    });
    const api: PostHogBrowserApi = {
      init: vi.fn(),
      capture: vi.fn(),
      opt_out_capturing: vi.fn(),
      reset: vi.fn(),
    };
    setPostHogApi(api);
    const analytics = createPostHogAnalytics({
      config,
      storage: localStorage,
      document,
      window,
    });

    expect(analytics.sync()).toBe(true);
    expect(api.init).toHaveBeenCalledOnce();
    expect(document.querySelector("script[data-snowmate-posthog]")).toBeNull();
    expect(
      analytics.capture("privacy_settings_viewed", { source: "profile" }),
    ).toBe(true);
    expect(api.capture).toHaveBeenCalledWith("privacy_settings_viewed", {
      source: "profile",
    });
  });

  it("loads and initializes privacy-preserving PostHog only after opt-in", () => {
    const api: PostHogBrowserApi = {
      init: vi.fn(),
      capture: vi.fn(),
      opt_out_capturing: vi.fn(),
      reset: vi.fn(),
    };
    const analytics = createPostHogAnalytics({
      config,
      storage: localStorage,
      document,
      window,
    });

    expect(
      analytics.optIn("9fc1a0dc-b151-4df2-86cb-f3015badf019"),
    ).toBe(true);
    const script = document.querySelector<HTMLScriptElement>(
      "script[data-snowmate-posthog]",
    );
    expect(script?.src).toBe(
      "https://eu-assets.i.posthog.com/static/array.js",
    );

    const queuedApi = (
      window as typeof window & {
        posthog?: PostHogBrowserApi & { _i?: unknown[][] };
      }
    ).posthog;
    expect(queuedApi?._i).toEqual([
      [
        config.projectKey,
        expect.objectContaining({
          api_host: config.apiHost,
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          disable_session_recording: true,
          person_profiles: "never",
          persistence: "memory",
          bootstrap: {
            distinctID: "9fc1a0dc-b151-4df2-86cb-f3015badf019",
            isIdentifiedID: false,
          },
        }),
        undefined,
      ],
    ]);

    setPostHogApi(api);
    script?.dispatchEvent(new Event("load"));

    expect(
      analytics.capture("privacy_settings_viewed", { source: "direct" }),
    ).toBe(true);
    expect(api.capture).toHaveBeenCalledWith("privacy_settings_viewed", {
      source: "direct",
    });
  });

  it("blocks disallowed data and stops permanently on withdrawal", () => {
    const api: PostHogBrowserApi = {
      init: vi.fn(),
      capture: vi.fn(),
      opt_out_capturing: vi.fn(),
      reset: vi.fn(),
    };
    const analytics = createPostHogAnalytics({
      config,
      storage: localStorage,
      document,
      window,
    });

    analytics.optIn("9fc1a0dc-b151-4df2-86cb-f3015badf019");
    setPostHogApi(api);
    document
      .querySelector<HTMLScriptElement>("script[data-snowmate-posthog]")
      ?.dispatchEvent(new Event("load"));

    expect(
      analytics.capture("privacy_settings_viewed", {
        source: "direct",
        email: "person@example.com",
      }),
    ).toBe(false);
    expect(api.capture).not.toHaveBeenCalled();

    analytics.withdraw();

    expect(readConsent(localStorage).analytics).toBe("denied");
    expect(readAnalyticsId(localStorage)).toBeNull();
    expect(api.opt_out_capturing).toHaveBeenCalledOnce();
    expect(api.reset).toHaveBeenCalledOnce();
    expect(document.querySelector("script[data-snowmate-posthog]")).toBeNull();
    expect(
      analytics.capture("privacy_settings_viewed", { source: "direct" }),
    ).toBe(false);
  });

  it("queues allowed events during download and clears the queue on withdrawal", () => {
    const analytics = createPostHogAnalytics({
      config,
      storage: localStorage,
      document,
      window,
    });

    analytics.optIn("9fc1a0dc-b151-4df2-86cb-f3015badf019");
    const queuedApi = (
      window as typeof window & { posthog?: PostHogBrowserApi & unknown[] }
    ).posthog;

    expect(
      analytics.capture("privacy_settings_viewed", { source: "direct" }),
    ).toBe(true);
    expect(queuedApi).toContainEqual([
      "capture",
      "privacy_settings_viewed",
      { source: "direct" },
    ]);

    analytics.withdraw();

    expect(queuedApi).toContainEqual(["opt_out_capturing"]);
    expect(queuedApi).toContainEqual(["reset"]);
    expect(document.querySelector("script[data-snowmate-posthog]")).toBeNull();
  });

  it("fails closed when the consented SDK download fails", () => {
    const analytics = createPostHogAnalytics({
      config,
      storage: localStorage,
      document,
      window,
    });

    analytics.optIn("9fc1a0dc-b151-4df2-86cb-f3015badf019");
    document
      .querySelector<HTMLScriptElement>("script[data-snowmate-posthog]")
      ?.dispatchEvent(new Event("error"));

    expect(document.querySelector("script[data-snowmate-posthog]")).toBeNull();
    expect(
      analytics.capture("privacy_settings_viewed", { source: "direct" }),
    ).toBe(false);
  });
});

describe("PostHog environment config", () => {
  it("accepts only a complete HTTPS EU configuration", () => {
    expect(
      readPostHogConfig({
        NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_key",
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
        NEXT_PUBLIC_POSTHOG_ASSET_HOST:
          "https://eu-assets.i.posthog.com",
      }),
    ).toEqual({
      projectKey: "phc_key",
      apiHost: "https://eu.i.posthog.com",
      assetHost: "https://eu-assets.i.posthog.com",
    });

    expect(readPostHogConfig({ NEXT_PUBLIC_POSTHOG_KEY: "phc_key" })).toBeNull();
    expect(
      readPostHogConfig({
        NEXT_PUBLIC_POSTHOG_KEY: "phc_key",
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
        NEXT_PUBLIC_POSTHOG_ASSET_HOST:
          "https://eu-assets.i.posthog.com",
      }),
    ).toBeNull();
    expect(
      readPostHogConfig({
        NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_key",
        NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
        NEXT_PUBLIC_POSTHOG_ASSET_HOST:
          "https://us-assets.i.posthog.com",
      }),
    ).toBeNull();
    expect(
      readPostHogConfig({
        NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
        NEXT_PUBLIC_POSTHOG_KEY: "invalid_key",
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
        NEXT_PUBLIC_POSTHOG_ASSET_HOST:
          "https://eu-assets.i.posthog.com",
      }),
    ).toBeNull();
    expect(
      readPostHogConfig({
        NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_key",
        NEXT_PUBLIC_POSTHOG_HOST: "not-a-url",
        NEXT_PUBLIC_POSTHOG_ASSET_HOST:
          "https://eu-assets.i.posthog.com/path",
      }),
    ).toBeNull();
  });
});
