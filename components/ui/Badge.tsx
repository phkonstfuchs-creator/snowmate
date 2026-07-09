import { ReactNode } from "react";

const TONES = {
  neutral: { bg: "var(--bg-surface-3)", fg: "var(--text-secondary)" },
  ice: { bg: "var(--accent-primary-subtle)", fg: "var(--ice-300)" },
  warm: { bg: "var(--accent-warm-subtle)", fg: "var(--ember-300)" },
  danger: { bg: "rgba(255,107,107,0.14)", fg: "var(--status-danger)" },
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
        borderRadius: "var(--radius-pill)",
        background: t.bg,
        color: t.fg,
        font: "600 12px var(--font-body)",
        letterSpacing: "0.01em",
      }}
    >
      {icon}
      {children}
    </span>
  );
}
