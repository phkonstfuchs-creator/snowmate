import { describe, expect, it } from "vitest";
import {
  validateLoginCredentials,
  validateSignupCredentials,
} from "./credentials";

const NOW = new Date("2026-08-03T12:00:00.000Z");

function validSignupInput(overrides: Record<string, unknown> = {}) {
  return {
    email: "new.rider@example.com",
    password: "Pistl2026Pass",
    confirmPassword: "Pistl2026Pass",
    inviteToken: "invite-token-00000000000000000001",
    birthDate: "2000-01-01",
    termsAccepted: true,
    privacyAccepted: true,
    ...overrides,
  };
}

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
    const result = validateSignupCredentials(validSignupInput(), NOW);

    expect(result.success).toBe(true);
  });

  it.each([
    ["too short", "Snow2026", "Snow2026"],
    ["no uppercase letter", "pistl2026pass", "pistl2026pass"],
    ["no lowercase letter", "PISTL2026PASS", "PISTL2026PASS"],
    ["no number", "PistlPassOnly", "PistlPassOnly"],
    ["different confirmation", "Pistl2026Pass", "Pistl2026Other"],
  ])("rejects %s", (_case, password, confirmPassword) => {
    const result = validateSignupCredentials(
      validSignupInput({ password, confirmPassword }),
      NOW,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.fieldErrors.password ?? result.fieldErrors.confirmPassword,
      ).toBeDefined();
    }
  });

  it("returns German guidance for a weak password", () => {
    const result = validateSignupCredentials(
      validSignupInput({ password: "short", confirmPassword: "short" }),
      NOW,
    );

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

  it("requires a URL-safe invitation and both current legal acknowledgements", () => {
    const result = validateSignupCredentials(
      validSignupInput({
        inviteToken: "too short",
        termsAccepted: false,
        privacyAccepted: false,
      }),
      NOW,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.inviteToken).toBeDefined();
      expect(result.fieldErrors.termsAccepted).toBeDefined();
      expect(result.fieldErrors.privacyAccepted).toBeDefined();
    }
  });

  it("rejects applicants under 16 and implausible birth dates", () => {
    const under16 = validateSignupCredentials(
      validSignupInput({ birthDate: "2010-08-04" }),
      NOW,
    );
    const tooOld = validateSignupCredentials(
      validSignupInput({ birthDate: "1900-01-01" }),
      NOW,
    );

    expect(under16.success).toBe(false);
    expect(tooOld.success).toBe(false);
    if (!under16.success) {
      expect(under16.fieldErrors.birthDate).toContain(
        "Pistl ist erst ab 16 Jahren verfügbar.",
      );
    }
  });
});
