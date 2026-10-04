/* Sliding-window rate limits for the sign-in, sign-up, reset and 2FA
   forms. Kept in the server's memory: on Vercel that is per instance, so
   it is a first line that stops scripted guessing from one visitor, not a
   global quota. Supabase Auth has its own limits behind it, and the
   database limits every signed-in account (public.check_request). */

export interface RateRule {
  /* Maximum attempts inside the window. */
  max: number;
  windowMs: number;
}

export const RATE_RULES = {
  /* Per visitor IP, any account. */
  loginIp: { max: 30, windowMs: 15 * 60_000 },
  /* Per visitor IP and email: password guessing on one account. */
  loginAccount: { max: 8, windowMs: 15 * 60_000 },
  signupIp: { max: 6, windowMs: 60 * 60_000 },
  handleCheckIp: { max: 60, windowMs: 10 * 60_000 },
  passwordResetIp: { max: 5, windowMs: 60 * 60_000 },
  mfaUser: { max: 10, windowMs: 15 * 60_000 },
  passwordChangeUser: { max: 5, windowMs: 60 * 60_000 },
  /* Sign-up code from the email: per visitor and per address. */
  signupCodeIp: { max: 20, windowMs: 15 * 60_000 },
  signupCodeEmail: { max: 8, windowMs: 15 * 60_000 },
  signupResendIp: { max: 5, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateRule>;

export type RateBucket = keyof typeof RATE_RULES;

const MAX_KEYS = 20_000;

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  /* Records an attempt and says whether it is still within the limit. */
  hit(bucket: RateBucket, key: string): boolean {
    const rule = RATE_RULES[bucket];
    const id = `${bucket}:${key}`;
    const time = this.now();
    const recent = (this.hits.get(id) ?? []).filter((at) => at > time - rule.windowMs);

    if (recent.length >= rule.max) {
      this.hits.set(id, recent);
      return false;
    }

    recent.push(time);
    this.hits.delete(id);
    this.hits.set(id, recent);
    this.evict();
    return true;
  }

  /* A successful sign-in clears the per-account counter, so a person who
     mistyped a few times is not punished afterwards. */
  reset(bucket: RateBucket, key: string): void {
    this.hits.delete(`${bucket}:${key}`);
  }

  private evict() {
    while (this.hits.size > MAX_KEYS) {
      const oldest = this.hits.keys().next().value;
      if (oldest === undefined) return;
      this.hits.delete(oldest);
    }
  }
}

/* One limiter per server instance. */
export const rateLimiter = new RateLimiter();
