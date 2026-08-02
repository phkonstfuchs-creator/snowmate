import { ReactNode } from "react";

const TONES = {
  neutral: { bg: "var(--paper-2)", fg: "var(--ink-1)" },
  ice: { bg: "transparent", fg: "var(--sky)" },
  warm: { bg: "var(--accent-warm-subtle)", fg: "var(--rust-ink)" },
  danger: { bg: "transparent", fg: "var(--crimson)" },
} as const;

interface BadgeProps {
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  children: ReactNode;
}

export default function Badge({ tone = "neutral", icon, children }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{
        height: 26,
        padding: "0 10px",
        borderRadius: 0,
        border: "1px solid currentColor",
        background: t.bg,
        color: t.fg,
        font: "700 11px var(--font-mono-stack)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {icon}
      {children}
    </span>
  );
}
