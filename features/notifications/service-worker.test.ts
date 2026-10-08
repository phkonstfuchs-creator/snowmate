import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
const listeners: Record<string, (event: unknown) => void> = {};
const context = runInNewContext(`${source}\n({ safePath, offlinePage })`, {
  self: { addEventListener(type: string, fn: (event: unknown) => void) { listeners[type] = fn; }, navigator: { language: "de-AT" } },
  Response: class { constructor(public body: string, public init: { headers: Record<string, string> }) {} },
  fetch: () => Promise.reject(new TypeError("offline")),
}) as { safePath: (value: unknown) => string; offlinePage: (url: string, lang: string) => string };
const { safePath, offlinePage } = context;

describe("push notification click target", () => {
  it("opens an internal page and rejects protocol-relative external URLs", () => {
    expect(safePath("/map")).toBe("/map");
    expect(safePath("/crew/chat/abc")).toBe("/crew/chat/abc");
    expect(safePath("//evil")).toBe("/feed");
    expect(safePath("/\\evil")).toBe("/feed");
    expect(safePath("/%2Fevil")).toBe("/feed");
  });
});

describe("offline fallback", () => {
  it("shows a Pistl page with the tabs and a retry link, never the browser error", async () => {
    let answered: Promise<{ body: string; init: { headers: Record<string, string> } }> | undefined;
    listeners.fetch?.({
      request: { mode: "navigate", method: "GET", url: "https://app.pistl.app/map" },
      respondWith: (response: typeof answered) => { answered = response; },
    });
    const response = await answered!;
    expect(response.body).toContain("Kein Netz");
    expect(response.body).toContain('href="https://app.pistl.app/map"');
    for (const tab of ["/feed", "/map", "/crew", "/profile"]) expect(response.body).toContain(`href="${tab}"`);
    expect(response.init.headers["Cache-Control"]).toBe("no-store");
  });

  it("leaves everything but page loads alone", () => {
    let called = false;
    listeners.fetch?.({ request: { mode: "cors", method: "GET", url: "https://app.pistl.app/x" }, respondWith: () => { called = true; } });
    listeners.fetch?.({ request: { mode: "navigate", method: "POST", url: "https://app.pistl.app/x" }, respondWith: () => { called = true; } });
    expect(called).toBe(false);
  });

  it("escapes the address it links back to", () => {
    expect(offlinePage('https://app.pistl.app/a"><script>', "en")).not.toContain("<script>");
    expect(offlinePage("https://app.pistl.app/feed", "en")).toContain("No signal");
  });
});
