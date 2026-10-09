import {
  readAnalyticsId,
  readConsent,
  writeAnalyticsConsent,
  type ConsentStorage,
} from "./consent";
import { createAnalyticsEvent } from "./events";

export type PostHogConfig = Readonly<{
  projectKey: string;
  apiHost: "https://eu.i.posthog.com";
  assetHost: "https://eu-assets.i.posthog.com";
}>;

export interface PostHogBrowserApi {
  init(projectKey: string, options: Record<string, unknown>): void;
  capture(event: string, properties: Record<string, string>): void;
  opt_out_capturing(): void;
  reset(): void;
}

export interface ConsentBoundAnalytics {
  capture(name: unknown, payload: unknown): boolean;
  optIn(analyticsId: string): boolean;
  sync(): boolean;
  withdraw(): void;
}

type PostHogWindow = Window &
  typeof globalThis & {
    posthog?: PostHogBrowserApi;
  };

type PostHogQueue = PostHogBrowserApi &
  unknown[] & {
    __SV: 1;
    _i: Array<[string, Record<string, unknown>, undefined]>;
  };

type PostHogEnvironment = Readonly<{
  NEXT_PUBLIC_ANALYTICS_ENABLED?: string;
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
  NEXT_PUBLIC_POSTHOG_ASSET_HOST?: string;
}>;

type PostHogAnalyticsOptions = Readonly<{
  config?: PostHogConfig | null;
  document?: Document;
  storage?: ConsentStorage;
  window?: PostHogWindow;
}>;

const SCRIPT_MARKER = "data-snowmate-posthog";

function isExactHttpsOrigin(value: string, expected: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.origin === expected &&
      (parsed.pathname === "/" || parsed.pathname === "") &&
      parsed.search === "" &&
      parsed.hash === ""
    );
  } catch {
    return false;
  }
}

export function readPostHogConfig(
  environment: PostHogEnvironment,
): PostHogConfig | null {
  const projectKey = environment.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const apiHost = environment.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  const assetHost = environment.NEXT_PUBLIC_POSTHOG_ASSET_HOST?.trim();

  if (
    environment.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !projectKey?.startsWith("phc_") ||
    !apiHost ||
    !assetHost ||
    !isExactHttpsOrigin(apiHost, "https://eu.i.posthog.com") ||
    !isExactHttpsOrigin(assetHost, "https://eu-assets.i.posthog.com")
  ) {
    return null;
  }

  return {
    projectKey,
    apiHost: "https://eu.i.posthog.com",
    assetHost: "https://eu-assets.i.posthog.com",
  };
}

function browserConfig(): PostHogConfig | null {
  return readPostHogConfig({
    NEXT_PUBLIC_ANALYTICS_ENABLED:
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_ASSET_HOST:
      process.env.NEXT_PUBLIC_POSTHOG_ASSET_HOST,
  });
}

export function createPostHogAnalytics(
  options: PostHogAnalyticsOptions = {},
): ConsentBoundAnalytics {
  const browserWindow =
    options.window ??
    (typeof window === "undefined" ? undefined : (window as PostHogWindow));
  const browserDocument =
    options.document ??
    (typeof document === "undefined" ? undefined : document);
  const storage =
    options.storage ??
    (typeof localStorage === "undefined" ? undefined : localStorage);
  const config = options.config === undefined ? browserConfig() : options.config;
  let script: HTMLScriptElement | null = null;
  let api: PostHogBrowserApi | null = null;
  let ready = false;

  function hasGrantedConsent(): boolean {
    return Boolean(storage && readConsent(storage).analytics === "granted");
  }

  function removeScript(): void {
    script?.remove();
    script = null;
    browserDocument
      ?.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER}]`)
      ?.remove();
  }

  function initOptions(
    analyticsId: string,
    activeConfig: PostHogConfig,
  ): Record<string, unknown> {
    return {
      api_host: activeConfig.apiHost,
      defaults: "2026-05-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      advanced_disable_feature_flags: true,
      person_profiles: "never",
      persistence: "memory",
      bootstrap: {
        distinctID: analyticsId,
        isIdentifiedID: false,
      },
    };
  }

  function createQueue(): PostHogQueue {
    const queue = [] as unknown as PostHogQueue;
    queue.__SV = 1;
    queue._i = [];
    queue.init = (projectKey, initialization) => {
      queue._i.push([projectKey, initialization, undefined]);
    };
    queue.capture = (event, properties) => {
      queue.push(["capture", event, properties]);
    };
    queue.opt_out_capturing = () => {
      queue.push(["opt_out_capturing"]);
    };
    queue.reset = () => {
      queue.push(["reset"]);
    };
    return queue;
  }

  function completeLoad(): void {
    if (
      !browserWindow ||
      !storage ||
      !config ||
      !hasGrantedConsent()
    ) {
      removeScript();
      return;
    }

    const loadedApi = browserWindow.posthog;
    if (!readAnalyticsId(storage) || !loadedApi) {
      removeScript();
      return;
    }

    api = loadedApi;
    ready = true;
  }

  function start(): boolean {
    if (
      !browserWindow ||
      !browserDocument ||
      !storage ||
      !config ||
      !hasGrantedConsent()
    ) {
      return false;
    }

    const analyticsId = readAnalyticsId(storage);
    if (!analyticsId) {
      return false;
    }

    if (ready) {
      return true;
    }

    const existingScript = browserDocument.querySelector<HTMLScriptElement>(
      `script[${SCRIPT_MARKER}]`,
    );
    if (existingScript) {
      script = existingScript;
      api = browserWindow.posthog ?? null;
      ready = Boolean(api);
      script.addEventListener("load", completeLoad, { once: true });
      return true;
    }

    const existingApi = browserWindow.posthog;
    if (existingApi) {
      existingApi.init(config.projectKey, initOptions(analyticsId, config));
      api = existingApi;
      ready = true;
      return true;
    }

    const queue = createQueue();
    browserWindow.posthog = queue;
    queue.init(config.projectKey, initOptions(analyticsId, config));
    api = queue;
    ready = true;

    script = browserDocument.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${config.assetHost}/static/array.js`;
    script.setAttribute(SCRIPT_MARKER, "");
    script.addEventListener("load", completeLoad, { once: true });
    script.addEventListener(
      "error",
      () => {
        ready = false;
        api = null;
        removeScript();
      },
      { once: true },
    );
    browserDocument.head.append(script);
    return true;
  }

  return {
    capture(name, payload) {
      if (!storage || !ready || !api || !hasGrantedConsent()) {
        return false;
      }

      const event = createAnalyticsEvent(name, payload);
      if (!event) {
        return false;
      }

      api.capture(event.event, { ...event.properties });
      return true;
    },
    optIn(analyticsId) {
      if (!storage) {
        return false;
      }

      const consent = writeAnalyticsConsent(storage, true, {
        analyticsId,
      });
      if (!consent) {
        return false;
      }

      start();
      return true;
    },
    sync() {
      return start();
    },
    withdraw() {
      if (storage) {
        writeAnalyticsConsent(storage, false);
      }

      ready = false;
      try {
        api?.opt_out_capturing();
        api?.reset();
      } finally {
        api = null;
        removeScript();
        if (browserWindow?.posthog) {
          delete browserWindow.posthog;
        }
      }
    },
  };
}
