interface XPBarProps {
  current: number;
  max: number;
  level?: number;
}

export default function XPBar({ current, max, level }: XPBarProps) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-baseline justify-between">
        {level != null && <span className="text-mono-label" style={{ color: "var(--text-tertiary)" }}>Stufe {level}</span>}
        <span style={{ font: "600 12px var(--font-mono)", color: "var(--sky)" }}>{current.toLocaleString("en-US")}/{max.toLocaleString("en-US")} XP</span>
      </div>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
