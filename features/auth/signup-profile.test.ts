import { describe, expect, it } from "vitest";
import { profileStepIssue, toSignupMetadata, validateSignupProfile, viennaToday } from "./signup-profile";

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

describe("profileStepIssue", () => {
  const ok = { name: "Lena Moser", handle: "lena_m", handleTaken: false, birthDate: "2008-01-02" };

  it("says what is still missing, in the order of the fields", () => {
    expect(profileStepIssue({ ...ok, name: "L" }, "2026-10-07")).toBe("onb.needName");
    expect(profileStepIssue({ ...ok, handle: "a" }, "2026-10-07")).toBe("onb.needHandle");
    expect(profileStepIssue({ ...ok, handleTaken: true }, "2026-10-07")).toBe("v.handleTaken");
    expect(profileStepIssue({ ...ok, birthDate: "" }, "2026-10-07")).toBe("onb.needBirthDate");
  });

  it("refuses under 14 on this step, not after the account step", () => {
    expect(profileStepIssue({ ...ok, birthDate: "2013-01-01" }, "2026-10-07")).toBe("age.tooYoung");
    expect(profileStepIssue({ ...ok, birthDate: "2012-10-07" }, "2026-10-07")).toBeNull();
  });

  it("is happy with a complete profile", () => {
    expect(profileStepIssue(ok, "2026-10-07")).toBeNull();
  });
});
