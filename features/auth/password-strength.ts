/* Password rules beyond length and character classes. Supabase's leaked
   password check (HaveIBeenPwned) needs a paid plan, so the most common
   passwords and variants of the person's own email are refused here. */

/* Lower-cased; checked after stripping digits and symbols from the end,
   so "Password123!" and "Pistl2026" are caught too. */
const COMMON = new Set([
  "password", "passwort", "qwertz", "qwerty", "qwertzuiop", "qwertyuiop", "asdfghjkl",
  "letmein", "welcome", "willkommen", "iloveyou", "admin", "administrator", "login",
  "pistl", "snowmate", "snowboard", "snowboarding", "skifahren", "skiing", "freeride", "powder",
  "innsbruck", "salzburg", "tirol", "austria", "oesterreich", "sommer", "winter",
  "football", "fussball", "monkey", "dragon", "master", "sunshine", "princess",
  "abcdefgh", "abcdefghijkl", "abc", "test", "geheim", "hallo", "schatz",
]);

const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertzuiop", "qwertyuiop", "asdfghjkl"];

function stem(password: string): string {
  return password.toLowerCase().replace(/[^a-zäöüß]+$/u, "").replace(/^[^a-zäöüß]+/u, "");
}

function isSequence(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.length >= 6 && SEQUENCES.some((seq) => seq.includes(lower) || [...seq].reverse().join("").includes(lower));
}

function isRepetition(value: string): boolean {
  return /^(.{1,3})\1+$/u.test(value);
}

export function isCommonPassword(password: string): boolean {
  const base = stem(password);
  return (
    /^\d+$/.test(password) ||
    COMMON.has(base) ||
    COMMON.has(password.toLowerCase()) ||
    isSequence(base) ||
    isSequence(password) ||
    isRepetition(password)
  );
}

/* True when the password is built around the email's name part. */
export function containsEmailName(password: string, email: string): boolean {
  const name = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9äöüß]/gu, "") ?? "";
  if (name.length < 4) return false;
  return password.toLowerCase().replace(/[^a-z0-9äöüß]/gu, "").includes(name);
}

/* 0 (weak) to 4 (strong), for the meter while typing. Acceptance is
   decided by the signup schema, not by this score. */
export function passwordScore(password: string, email = ""): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  if (isCommonPassword(password) || (email && containsEmailName(password, email))) return 0;

  const classes = [/[a-z]/u, /[A-Z]/u, /[0-9]/u, /[^A-Za-z0-9]/u].filter((re) => re.test(password)).length;
  const unique = new Set(password).size;
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (classes >= 3) score += 1;
  if (classes === 4 || unique >= 12) score += 1;
  if (unique < 6) score = Math.min(score, 1);
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}
