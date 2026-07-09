import { ReactNode } from "react";

const TIERS = {
  bronze: { fg: "#C9866B", ring: "rgba(201,134,107,0.35)" },
  silver: { fg: "#B9C4CC", ring: "rgba(185,196,204,0.35)" },
  gold: { fg: "var(--ember-400)", ring: "rgba(255,162,60,0.4)" },
  ice: { fg: "var(--ice-300)", ring: "rgba(127,220,250,0.4)" },
};

interface LevelBadgeProps {
  level: number;
  tier?: keyof typeof TIERS;
  icon?: ReactNode;
  size?: number;
}

export default function LevelBadge({ level, tier = "ice", icon, size = 48 }: LevelBadgeProps) {
  const t = TIERS[tier];
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size * 1.1,
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        background: "linear-gradient(160deg, var(--bg-surface-2), var(--bg-surface-1))",
        boxShadow: `inset 0 0 0 2px ${t.ring}`,
      }}
    >
      <div className="flex flex-col items-center" style={{ color: t.fg }}>
        {icon}
        <span style={{ font: `800 ${Math.round(size * 0.34)}px var(--font-display)`, lineHeight: 1 }}>{level}</span>
      </div>
    </div>
  );
}
