import { describe, expect, it } from "vitest";
import { de } from "./messages/de";
import { en, type MessageKey } from "./messages/en";
import { pickLocale } from "./locales";
import {
  format,
  translateFieldErrors,
  translateText,
  translateValidation,
  translator,
} from "./translate";

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
}

describe("dictionaries", () => {
  it("German uses exactly the English placeholders for every key", () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(placeholders(de[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it("German has no key that English lacks and no empty string", () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
    for (const value of Object.values(de)) expect(value.trim()).not.toBe("");
  });

  it("German is actually translated", () => {
    expect(de["nav.today"]).toBe("Heute");
    expect(de["profile.deleteWord"]).toBe("löschen");
  });
});

describe("translator", () => {
  it("fills placeholders and keeps unknown ones visible", () => {
    expect(translator("de")("common.minAgo", { n: 5 })).toBe("vor 5 Min.");
    expect(format("{a} {b}", { a: 1 })).toBe("1 {b}");
    expect(format("plain")).toBe("plain");
  });

  it("passes non-keys through and decodes counts", () => {
    const t = translator("en");
    expect(translateText(t, "already translated")).toBe("already translated");
    expect(translateText(t, "rides.full")).toBe("This ride is full.");
    expect(translateValidation(t, "v.max|120")).toBe("Use at most 120 characters.");
    expect(translateValidation(t, "not a key|3")).toBe("not a key|3");
    expect(
      translateFieldErrors(t, { a: "v.pickDate", b: ["v.min|3"], c: undefined }),
    ).toEqual({ a: "Pick a date.", b: ["Use at least 3 characters."] });
  });
});

describe("pickLocale", () => {
  it("prefers the cookie, then the browser, then English", () => {
    expect(pickLocale("de", "en-US")).toBe("de");
    expect(pickLocale(undefined, "fr;q=0.9, de-AT;q=0.8")).toBe("de");
    expect(pickLocale("xx", "fr")).toBe("en");
    expect(pickLocale(undefined, null)).toBe("en");
  });
});
