import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

type ServiceWorkerEvent = {
  request?: {
    destination: string;
    method: string;
    mode: string;
    url: string;
  };
  respondWith?: (response: Promise<unknown>) => void;
  waitUntil?: (work: Promise<unknown>) => void;
};

type ServiceWorkerHandler = (event: ServiceWorkerEvent) => void;

function loadServiceWorker() {
  const handlers = new Map<string, ServiceWorkerHandler>();
  const cachedResponse = {
    clone: vi.fn(),
    ok: true,
    type: "basic",
  };
  const cache = {
    addAll: vi.fn(async (assets: readonly string[]) => {
      void assets;
    }),
    match: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
  };
  const cachesApi = {
    delete: vi.fn(async () => true),
    keys: vi.fn(async () => ["snowmate-static-old"]),
    open: vi.fn(async () => cache),
  };
  const fetchApi = vi.fn(async () => cachedResponse);
  const worker = {
    addEventListener: vi.fn(
      (type: string, handler: ServiceWorkerHandler) => handlers.set(type, handler),
    ),
    clients: { claim: vi.fn(async () => undefined) },
    location: { origin: "https://pistl.test" },
    skipWaiting: vi.fn(async () => undefined),
  };
  const source = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

  Function("self", "caches", "fetch", source)(worker, cachesApi, fetchApi);

  return { cache, cachesApi, fetchApi, handlers };
}

function request(path: string, overrides: Partial<NonNullable<ServiceWorkerEvent["request"]>> = {}) {
  return {
    destination: "",
    method: "GET",
    mode: "cors",
    url: `https://pistl.test${path}`,
    ...overrides,
  };
}

describe("Pistl service worker cache policy", () => {
  it("pre-caches only fixed public visual assets", async () => {
    const { cache, handlers } = loadServiceWorker();
    let work: Promise<unknown> | undefined;

    handlers.get("install")?.({ waitUntil: (pending) => { work = pending; } });
    await work;

    const assets = cache.addAll.mock.calls[0]?.[0] ?? [];
    expect(assets).toEqual(expect.arrayContaining(["/logo.png", "/logo-print.png", "/icon.png"]));
    expect(assets.every((asset) => asset.startsWith("/"))).toBe(true);
    expect(assets.join(" ")).not.toMatch(
      /(?:\/api|\/auth|\/profile|\/chat|\/location|\/feed)/,
    );
  });

  it.each([
    ["/feed", { destination: "document", mode: "navigate" }],
    ["/api/profile", {}],
    ["/auth/confirm", {}],
    ["/profile", {}],
    ["/crew/chat", {}],
    ["/map/location", {}],
  ])("never intercepts private or dynamic request %s", (path, overrides) => {
    const { handlers } = loadServiceWorker();
    const respondWith = vi.fn();

    handlers.get("fetch")?.({
      request: request(path, overrides),
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
  });

  it("cache-first handles only same-origin immutable Next build assets", async () => {
    const { cache, fetchApi, handlers } = loadServiceWorker();
    let response: Promise<unknown> | undefined;

    handlers.get("fetch")?.({
      request: request("/_next/static/chunks/app/abc123.js", {
        destination: "script",
      }),
      respondWith: (pending) => { response = pending; },
    });

    await response;
    expect(cache.match).toHaveBeenCalledOnce();
    expect(fetchApi).toHaveBeenCalledOnce();
    expect(cache.put).toHaveBeenCalledOnce();
  });

  it("ignores cross-origin, queried public, and non-GET assets", () => {
    const { handlers } = loadServiceWorker();

    for (const candidate of [
      request("/logo.png?user=123", { destination: "image" }),
      request("/logo.png", { destination: "image", method: "POST" }),
      {
        ...request("/_next/static/chunks/app/abc123.js", {
          destination: "script",
        }),
        url: "https://cdn.example.com/_next/static/chunks/app/abc123.js",
      },
    ]) {
      const respondWith = vi.fn();
      handlers.get("fetch")?.({ request: candidate, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });
});
