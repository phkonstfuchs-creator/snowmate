import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("Pistl web app manifest", () => {
  it("describes an installable standalone PWA", () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: "/",
      name: "Pistl",
      short_name: "Pistl",
      start_url: "/feed",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f2eadb",
      theme_color: "#a83f1b",
    });

    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ sizes: "512x512", type: "image/png" }),
      ]),
    );

    for (const icon of value.icons ?? []) {
      expect(typeof icon.src).toBe("string");
      expect(icon.src).not.toBe("");
    }
  });
});
