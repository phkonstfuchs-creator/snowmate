import { describe, expect, it } from "vitest";
import { toSignupMetadata, validateSignupProfile, viennaToday } from "./signup-profile";

const base = { displayName: " Lena ", handle: "@Lena_M", city: "salzburg", ridingStyles: ["park"], birthDate: "2010-10-04" };

describe("validateSignupProfile", () => {
  it("accepts a 14-year-old on their birthday and normalises", () => {
    const result = validateSignupProfile(base, "2024-10-04");
    expect(result).toEqual({
      success: true,
      data: { displayName: "Lena", handle: "lena_m", city: "salzburg", ridingStyles: ["park"], birthDate: "2010-10-04" },
    });
  });

  it("refuses the day before the 14th birthday", () => {
    expect(validateSignupProfile(base, "2024-10-03")).toEqual({ success: false, fieldErrors: { birthDate: "age.tooYoung" } });
  });

  it.each(["2030-01-01", "1800-01-01", "2010-02-30", ""])("refuses the date %s", (birthDate) => {
    expect(validateSignupProfile({ ...base, birthDate }, "2024-10-04")).toEqual({ success: false, fieldErrors: { birthDate: "age.invalid" } });
  });

  it("maps to the metadata the database reads", () => {
    const result = validateSignupProfile(base, "2024-10-04");
    expect(result.success && toSignupMetadata(result.data)).toEqual({
      display_name: "Lena", handle: "lena_m", city: "salzburg", riding_styles: ["park"], birth_date: "2010-10-04",
    });
  });

  it("knows today in Vienna", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Vienna.
    expect(viennaToday(new Date("2025-12-31T23:30:00Z"))).toBe("2026-01-01");
  });
});
