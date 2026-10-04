/* Where a confirmation or reset link may send the person afterwards. */
const ALLOWED_NEXT = new Set(["/feed", "/reset-password", "/profile"]);

export function safeNextPath(value: string | null | undefined): string {
  return value && ALLOWED_NEXT.has(value) ? value : "/feed";
}
