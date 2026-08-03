import { describe, expect, it } from "vitest";
import {
  validateLoginCredentials,
  validateSignupCredentials,
} from "./credentials";

describe("validateLoginCredentials", () => {
  it("normalizes a valid email address", () => {
    const result = validateLoginCredentials({
      email: "  RIDER@Example.COM ",
      password: "existing-password",
    });

    expect(result).toEqual({
      success: true,
      data: {
        email: "rider@example.com",
        password: "existing-password",
      },
    });
  });

  it("rejects malformed and oversized credentials", () => {
    const result = validateLoginCredentials({
      email: "not-an-email",
      password: "x".repeat(129),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.email).toContain(
        "Gib eine gültige E-Mail-Adresse ein.",
      );
      expect(result.fieldErrors.password).toContain("Passwort ist zu lang.");
    }
  });
});

describe("validateSignupCredentials", () => {
  it("accepts a strong password that is confirmed", () => {
    const result = validateSignupCredentials({
      email: "new.rider@example.com",
      password: "Snowmate2026Pass",
      confirmPassword: "Snowmate2026Pass",
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["too short", "Snow2026", "Snow2026"],
    ["no uppercase letter", "snowmate2026pass", "snowmate2026pass"],
    ["no lowercase letter", "SNOWMATE2026PASS", "SNOWMATE2026PASS"],
    ["no number", "SnowmatePassOnly", "SnowmatePassOnly"],
    ["different confirmation", "Snowmate2026Pass", "Snowmate2026Other"],
  ])("rejects %s", (_case, password, confirmPassword) => {
    const result = validateSignupCredentials({
      email: "new.rider@example.com",
      password,
      confirmPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.fieldErrors.password ?? result.fieldErrors.confirmPassword,
      ).toBeDefined();
    }
  });

  it("returns German guidance for a weak password", () => {
    const result = validateSignupCredentials({
      email: "new.rider@example.com",
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.password).toContain(
        "Verwende mindestens 12 Zeichen.",
      );
      expect(result.fieldErrors.password).toContain(
        "Füge einen Großbuchstaben hinzu.",
      );
      expect(result.fieldErrors.password).toContain("Füge eine Zahl hinzu.");
    }
  });
});
