/* The iOS and Android shells (ADR 0031) append this marker to the
   WebView's user agent. It only hides web-only things such as the demo
   with its Season Pass price; it is never used for access control,
   because anyone can send any user agent. */
export const NATIVE_APP_MARKER = "PistlApp/";

export function isNativeApp(userAgent: string | null | undefined): boolean {
  return typeof userAgent === "string" && userAgent.includes(NATIVE_APP_MARKER);
}
