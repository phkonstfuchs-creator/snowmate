import { describe, expect, it } from "vitest";
import { articlesUrl, fileInfoUrl, isFreeLicense, leadImages, photosFrom, plainText } from "./resort-photo";

const meta = (overrides: Record<string, string> = {}) =>
  Object.fromEntries(
    Object.entries({ LicenseShortName: "CC BY-SA 4.0", LicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", Artist: '<a href="//commons.wikimedia.org/wiki/User:Anna">Anna K.</a>', Restrictions: "", ...overrides })
      .map(([key, value]) => [key, { value }]),
  );

const file = (title: string, overrides: Partial<{ mime: string; thumburl: string; descriptionurl: string }> = {}, metadata = meta()) => ({
  title,
  imageinfo: [{
    thumburl: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${encodeURIComponent(title)}/1200px.jpg`,
    thumbwidth: 1200, thumbheight: 800,
    descriptionurl: "https://commons.wikimedia.org/wiki/File:Bergeralm.jpg",
    mime: "image/jpeg",
    extmetadata: metadata,
    ...overrides,
  }],
});

describe("resort photos", () => {
  it("asks German Wikipedia for free lead images and their file data", () => {
    const articles = new URL(articlesUrl(["Bergeralm", "Kühtai"]));
    expect(articles.hostname).toBe("de.wikipedia.org");
    expect(articles.searchParams.get("pilicense")).toBe("free");
    expect(articles.searchParams.get("titles")).toBe("Bergeralm|Kühtai");
    expect(new URL(fileInfoUrl(["Berger Alm.jpg"])).searchParams.get("titles")).toBe("Datei:Berger Alm.jpg");
  });

  it("follows normalised titles and redirects to the article's image", () => {
    const images = leadImages({
      query: {
        redirects: [{ from: "Bergeralm", to: "Bergeralm (Skigebiet)" }],
        pages: [
          { title: "Bergeralm (Skigebiet)", pageimage: "Bergeralm_Winter.jpg" },
          { title: "Kühtai", missing: true },
        ],
      },
    });
    expect(images.Bergeralm).toBe("Bergeralm_Winter.jpg");
    expect(images["Kühtai"]).toBeUndefined();
    expect(leadImages(null)).toEqual({});
  });

  it("keeps free JPEG photos with their author, licence and source", () => {
    const photos = photosFrom({ Bergeralm: "Bergeralm_Winter.jpg" }, { query: { pages: [file("Datei:Bergeralm Winter.jpg")] } });
    expect(photos.Bergeralm).toMatchObject({
      author: "Anna K.",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Bergeralm.jpg",
      width: 1200,
    });
  });

  it("drops logos, unfree or restricted files and foreign hosts", () => {
    const images = { A: "a.svg", B: "b.jpg", C: "c.jpg", D: "d.jpg", E: "e.jpg" };
    const photos = photosFrom(images, {
      query: {
        pages: [
          file("Datei:A.svg", { mime: "image/svg+xml" }),
          file("Datei:B.jpg", {}, meta({ LicenseShortName: "GFDL" })),
          file("Datei:C.jpg", {}, meta({ Restrictions: "trademarked" })),
          file("Datei:D.jpg", { thumburl: "https://evil.example/d.jpg" }),
          file("Datei:E.jpg", { descriptionurl: "https://evil.example/page" }),
        ],
      },
    });
    expect(photos).toEqual({});
  });

  it("accepts the common free licences only", () => {
    for (const name of ["CC BY-SA 3.0", "CC BY 2.0", "CC BY-SA 3.0 at", "CC0", "Public domain"]) expect(isFreeLicense(name)).toBe(true);
    for (const name of ["GFDL", "All rights reserved", "CC BY-NC 4.0", "CC BY-ND 4.0", ""]) expect(isFreeLicense(name)).toBe(false);
  });

  it("turns the author HTML into plain text", () => {
    expect(plainText('<span>Max &amp; <a href="x">Moritz</a></span>')).toBe("Max & Moritz");
    expect(plainText("<script>alert(1)</script>Ok")).toBe("alert(1) Ok");
  });
});
