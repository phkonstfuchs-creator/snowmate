/* Between "Create account" and the code from the email, the server has to
   remember which address the code belongs to. An httpOnly cookie keeps it
   out of the URL and out of reach of page scripts. It only ever holds the
   visitor's own address and lasts as long as the code is valid. The
   cookie itself is read in queries.ts and written in actions.ts. */
export const PENDING_SIGNUP_COOKIE = "pistl_pending_signup";

export function pendingSignupCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60,
  };
}

/* Only something that looks like an address is accepted back. */
export function parsePendingSignup(value: string | undefined): string | null {
  const email = value ?? "";
  return email.length <= 254 && /^[^\s@]+@[^\s@]+$/u.test(email) ? email : null;
}

/* "lena@example.com" -> "l•••@example.com", for the screen. */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}•••@${domain}`;
}
