/* The Pistl logo: "pistl" in heavy Hanken Grotesk, tightly set, with
   the full stop in pine. Same as the website header. */
export default function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Pistl"
      className={className}
      style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.075em", lineHeight: 1, color: "var(--ink-0)", fontFamily: "var(--font-body-stack)" }}
    >
      pistl<span style={{ color: "var(--rust)" }}>.</span>
    </span>
  );
}
