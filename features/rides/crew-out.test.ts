import { describe, expect, it } from "vitest";
import { crewOutLine, firstName } from "./crew-out";

const person = (id: string, name: string) => ({ id, name });

describe("crewOutLine", () => {
  it("names the friends who are out, first names only", () => {
    expect(crewOutLine([person("a", "Sophie Wagner")], ["a"], 1)).toEqual({ key: "feed.crewOutOne", values: { a: "Sophie" }, friendIds: ["a"] });
    expect(crewOutLine([person("a", "Sophie Wagner"), person("b", "Julia Mayer")], ["a", "b"], 2)).toEqual({
      key: "feed.crewOutTwo", values: { a: "Sophie", b: "Julia" }, friendIds: ["a", "b"],
    });
  });

  it("counts the rest beyond two names", () => {
    const faces = [person("a", "Sophie W"), person("b", "Julia M"), person("c", "Max H"), person("d", "Tom K")];
    expect(crewOutLine(faces, ["a", "b", "c", "d"], 4)).toEqual({
      key: "feed.crewOutMore", values: { a: "Sophie", b: "Julia", n: 2 }, friendIds: ["a", "b", "c", "d"],
    });
  });

  it("never calls someone a friend who is not one, and falls back to the real count", () => {
    expect(crewOutLine([person("x", "Florian Mayr")], ["a"], 1)).toEqual({ key: "feed.outToday", values: { n: 1 }, friendIds: [] });
  });

  it("says nothing when nobody is out", () => {
    expect(crewOutLine([], ["a"], 0)).toBeNull();
  });
});

describe("firstName", () => {
  it("keeps a single name and trims", () => {
    expect(firstName("  Lena  ")).toBe("Lena");
    expect(firstName("")).toBe("");
  });
});
