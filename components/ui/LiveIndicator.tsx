export default function LiveIndicator({ label = "LIVE", size = "md" }: { label?: string; size?: "sm" | "md" }) {
  const dot = size === "sm" ? 6 : 8;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="pulse-dot" style={{ width: dot, height: dot }} />
      <span className="text-mono-label" style={{ color: "var(--ice-300)" }}>{label}</span>
    </span>
  );
}
