/* Spotfarben des Bogens — jede ist gegen Papier und gegen weiße
   Initialen geprüft, damit Avatare nie aus der Palette fallen. */
const AVATAR_COLORS = ["#a83f1b", "#2a5647", "#3e6e8e", "#8f3415", "#3b7561", "#2f5570"];

export function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

interface AvatarProps {
  id: string;
  initials: string;
  size?: number;
  live?: boolean;
  verified?: boolean;
  className?: string;
}

export default function Avatar({ id, initials, size = 40, live = false, verified = false, className = "" }: AvatarProps) {
  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className="avatar-initials text-white"
        style={{
          width: size,
          height: size,
          background: avatarColor(id),
          fontSize: Math.round(size * 0.36),
          border: live ? `2px solid var(--live-dot)` : "2px solid transparent",
        }}
      >
        {initials}
      </div>
      {live && (
        <span
          className="absolute rounded-full"
          style={{
            right: -1,
            bottom: -1,
            width: size * 0.28,
            height: size * 0.28,
            background: "var(--live-dot)",
            border: "2px solid var(--bg-canvas)",
          }}
        />
      )}
      {verified && (
        <span
          className="absolute rounded-full flex items-center justify-center"
          style={{
            right: -2,
            bottom: -2,
            width: size * 0.34,
            height: size * 0.34,
            background: "var(--accent-primary)",
            border: "2px solid var(--bg-surface-1)",
          }}
        >
          <svg width={size * 0.18} height={size * 0.18} viewBox="0 0 9 9" fill="none">
            <path d="M2 4.5l1.5 1.5L7 2.5" stroke="var(--text-on-accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </div>
  );
}
