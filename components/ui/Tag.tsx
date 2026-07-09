import { AbilityLevel } from "@/lib/types";
import Icon from "./Icon";

const LEVEL: Record<AbilityLevel, { label: string; cls: string; icon: string }> = {
  chill: { label: "Chill", cls: "badge-chill", icon: "sun" },
  park: { label: "Park", cls: "badge-park", icon: "zap" },
  "off-piste": { label: "Off-piste", cls: "badge-offpiste", icon: "mountain-snow" },
};

export default function Tag({ level, showIcon = true }: { level: AbilityLevel; showIcon?: boolean }) {
  const s = LEVEL[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${s.cls}`}
      style={{
        height: 26,
        padding: "0 11px",
        borderRadius: "var(--radius-pill)",
        font: "700 11px var(--font-mono)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {showIcon && <Icon name={s.icon} size={12} />}
      {s.label}
    </span>
  );
}
