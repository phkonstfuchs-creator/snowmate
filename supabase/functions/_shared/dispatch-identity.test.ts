import { describe, expect, it } from "vitest";
import { identityFromVerifiedToken } from "./dispatch-identity";

const userId = "a11f7000-0000-4000-8000-000000000001";
const sessionId = "b11f7000-0000-4000-8000-000000000002";
const token = (claims: Record<string, unknown>) => `e30.${btoa(JSON.stringify(claims)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.signature`;

describe("identity from an Auth-verified user token", () => {
  it("passes only the signed subject and session id to the scoped queue RPC", () => {
    expect(identityFromVerifiedToken(token({ role: "authenticated", sub: userId, session_id: sessionId }), userId))
      .toEqual({ userId, sessionId });
  });

  it("rejects missing, malformed, anonymous, and mismatched claims", () => {
    for (const claims of [
      { role: "authenticated", sub: userId },
      { role: "authenticated", sub: userId, session_id: "not-a-uuid" },
      { role: "anon", sub: userId, session_id: sessionId },
      { role: "authenticated", sub: "c11f7000-0000-4000-8000-000000000003", session_id: sessionId },
    ]) {
      expect(identityFromVerifiedToken(token(claims), userId)).toBeNull();
    }
    expect(identityFromVerifiedToken("malformed", userId)).toBeNull();
  });
});
