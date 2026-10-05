"use client";

import Image from "next/image";
import { useState } from "react";

/* Quiet greens and greys from the website palette; each holds white
   initials (AA). */
const AVATAR_COLORS = ["#315842", "#4d5948", "#35576a", "#5b5446", "#31705a", "#46524c"];

export function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

interface AvatarProps {
  id: string;
  /* Changes when the picture changes, so the browser fetches it anew. */
  version?: string | null;
  initials: string;
  size?: number;
  live?: boolean;
  verified?: boolean;
  className?: string;
}

/* Initials, with the person's picture on top once it has loaded. Real
   accounts (uuid ids) ask /avatar/<id>; the server answers 404 when there
   is no picture or the viewer may not see it, and the initials stay. */
export default function Avatar({ id, version = null, initials, size = 40, live = false, verified = false, className = "" }: AvatarProps) {
  const [photo, setPhoto] = useState<"loading" | "shown" | "none">("loading");
  const src = `/avatar/${id}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
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
      {UUID.test(id) && photo !== "none" && (
        <Image
          key={src}
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          loading="lazy"
          onLoad={() => setPhoto("shown")}
          onError={() => setPhoto("none")}
          className="absolute inset-0 rounded-full object-cover"
          style={{ width: size, height: size, opacity: photo === "shown" ? 1 : 0 }}
        />
      )}
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
