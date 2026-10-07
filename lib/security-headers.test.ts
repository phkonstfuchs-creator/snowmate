import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./security-headers";

describe("script CSP", () => {
  it("permits only nonced scripts in production without inline/eval bypasses", () => {
    const policy = contentSecurityPolicy("YWJj", false);
    const scripts = policy.split("; ").find((part) => part.startsWith("script-src"));
    expect(scripts).toContain("'nonce-YWJj'");
    expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(policy).toContain("frame-ancestors 'none'");
  });
  it("rejects nonce header injection", () => {
    expect(() => contentSecurityPolicy("x'; script-src *", false)).toThrow();
  });
});
