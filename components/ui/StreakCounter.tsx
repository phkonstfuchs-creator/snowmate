function flameColor(units: number) {
  if (units >= 30) return "var(--rust-ink)";
  if (units >= 10) return "var(--rust)";
  if (units >= 5) return "var(--rust)";
  return "var(--sky)";
}

interface StreakCounterProps {
  value: number;
  unitLabel: string;
  size?: "md" | "lg";
}

export default function StreakCounter({ value, unitLabel, size = "md" }: StreakCounterProps) {
  const big = size === "lg";
  const color = flameColor(value);

  return (
    <div
      className="inline-flex flex-col items-center gap-1"
      style={{
        padding: big ? "28px 36px" : "16px 22px",
        borderRadius: "var(--radius-xl)",
        background: "var(--bg-surface-1)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ color }}>
        <svg width={big ? 40 : 28} height={big ? 40 : 28} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c1 3-2 4-2 7 0 1.5 1 2.5 2 2.5s2-1 2-2c1.8 1.4 3 3.6 3 5.9 0 3.6-3.1 6.6-7 6.6s-7-3-7-6.6C3 12 6 9 8 6c.8 2 .2 3.4 1 4.4C9.4 8.6 10.8 5.8 12 2Z" />
        </svg>
      </div>
      <div style={{ font: big ? "var(--text-mono-data-lg)" : "var(--text-mono-data)", color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="text-mono-label" style={{ color: "var(--text-tertiary)" }}>{unitLabel}</div>
    </div>
  );
}
