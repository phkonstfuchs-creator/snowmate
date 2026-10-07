/* The Pistl logo: "pistl." in heavy Hanken Grotesk, tightly set. The
   full stop gets a little air so it does not touch the "l". Same as
   the website header; the only place the app still uses that face. */
export default function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Pistl"
      className={className}
      style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.075em", lineHeight: 1, color: "var(--ink-0)", fontFamily: "\"Hanken Grotesk Variable\", var(--font-body-stack)" }}
    >
      pistl<span style={{ marginLeft: "0.05em" }}>.</span>
    </span>
  );
}
