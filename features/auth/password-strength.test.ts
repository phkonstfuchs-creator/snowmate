import { describe, expect, it } from "vitest";
import { containsEmailName, isCommonPassword, passwordScore } from "./password-strength";

describe("password strength", () => {
  it.each(["Password123!", "Pistl2026", "Qwertz123456", "123456789012", "aaaaaaaaaaaa", "abcabcabcabc", "Innsbruck2026!"])(
    "flags %s as common",
    (password) => {
      expect(isCommonPassword(password)).toBe(true);
    },
  );

  it.each(["Fresh-Powder-2026", "Lift7Queue!Morning", "Pistl2026Pass"])("accepts %s", (password) => {
    expect(isCommonPassword(password)).toBe(false);
  });

  it("finds the email name inside the password", () => {
    expect(containsEmailName("Lena.Moser2026!", "lena.moser@example.com")).toBe(true);
    expect(containsEmailName("Fresh-Powder-2026", "lena.moser@example.com")).toBe(false);
    expect(containsEmailName("Abc12345678x", "abc@example.com")).toBe(false); // too short to judge
  });

  it("scores from 0 to 4", () => {
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("Password123!")).toBe(0);
    expect(passwordScore("lena2026long!", "lena2026@x.at")).toBe(0);
    expect(passwordScore("abcdefgh1")).toBeLessThanOrEqual(1);
    expect(passwordScore("Fresh-Powder-2026")).toBeGreaterThanOrEqual(3);
  });
});
