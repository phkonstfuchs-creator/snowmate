import { describe, expect, it } from "vitest";
import { RATE_RULES, RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit inside the window, then refuses", () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    for (let i = 0; i < RATE_RULES.loginAccount.max; i += 1) {
      expect(limiter.hit("loginAccount", "a")).toBe(true);
    }
    expect(limiter.hit("loginAccount", "a")).toBe(false);
    expect(limiter.hit("loginAccount", "b")).toBe(true);

    now += RATE_RULES.loginAccount.windowMs + 1;
    expect(limiter.hit("loginAccount", "a")).toBe(true);
  });

  it("keeps buckets apart and can reset one key", () => {
    const limiter = new RateLimiter(() => 0);
    for (let i = 0; i < RATE_RULES.signupIp.max; i += 1) limiter.hit("signupIp", "ip");
    expect(limiter.hit("signupIp", "ip")).toBe(false);
    expect(limiter.hit("loginIp", "ip")).toBe(true);
    limiter.reset("signupIp", "ip");
    expect(limiter.hit("signupIp", "ip")).toBe(true);
  });

  it("does not grow without bound", () => {
    const limiter = new RateLimiter(() => 0);
    for (let i = 0; i < 20_050; i += 1) limiter.hit("handleCheckIp", `ip-${i}`);
    // The oldest keys were evicted, so the first one starts fresh.
    expect(limiter.hit("handleCheckIp", "ip-0")).toBe(true);
  });
});
