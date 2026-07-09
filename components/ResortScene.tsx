"use client";

import React from "react";

const SNOW = "#EAF6FB";
const FAR  = "#22303A";
const MID  = "#171F27";
const NEAR = "#10161C";

// 6 distinct alpine mountain compositions (400×180 viewBox)
const SCENES = [
  // 0 — Nordkette: dramatic single dominant peak
  {
    far:  "M0,180 L0,148 L68,122 L128,82 L200,14 L272,84 L332,120 L400,146 L400,180Z",
    snow: ["M200,14 L162,66 L238,66Z"],
    mid:  "M0,180 L0,163 L78,145 L185,160 L282,140 L385,156 L400,158 L400,180Z",
    near: "M0,180 L0,173 L118,166 L224,170 L362,165 L400,173 L400,180Z",
  },
  // 1 — Drei Gipfel: three peaks of different heights
  {
    far:  "M0,180 L0,142 L44,108 L82,126 L146,50 L180,78 L232,96 L286,44 L326,80 L366,118 L400,140 L400,180Z",
    snow: ["M44,108 L26,132 L64,132Z", "M146,50 L116,86 L178,86Z", "M286,44 L255,80 L316,80Z"],
    mid:  "M0,180 L0,160 L68,140 L186,154 L296,128 L386,146 L400,152 L400,180Z",
    near: "M0,180 L64,168 L188,162 L338,168 L400,172 L400,180Z",
  },
  // 2 — Gletscher: wide glacial massif with heavy snow
  {
    far:  "M0,180 L0,130 L34,108 L94,76 L186,56 L266,60 L342,86 L386,112 L400,130 L400,180Z",
    snow: ["M94,76 L34,118 L0,135 L0,130 L34,108 L94,76 L186,56 L266,60 L342,86 L342,100 L266,72 L186,68 L94,88Z"],
    mid:  "M0,180 L0,152 L54,130 L186,116 L322,132 L400,150 L400,180Z",
    near: "M0,180 L44,168 L186,157 L332,162 L400,168 L400,180Z",
  },
  // 3 — Zwillinge: twin peaks with valley between
  {
    far:  "M0,180 L0,144 L54,104 L104,130 L156,116 L186,130 L238,80 L300,116 L354,130 L400,142 L400,180Z",
    snow: ["M54,104 L30,132 L80,132Z", "M238,80 L208,114 L268,114Z"],
    mid:  "M0,180 L0,163 L74,140 L186,153 L300,132 L400,148 L400,180Z",
    near: "M0,180 L80,168 L202,162 L342,168 L400,172 L400,180Z",
  },
  // 4 — Alpen-Panorama: many peaks, wide range
  {
    far:  "M0,180 L0,137 L24,128 L54,112 L90,122 L136,94 L176,108 L224,84 L266,102 L306,87 L346,108 L386,122 L400,137 L400,180Z",
    snow: ["M136,94 L114,118 L158,118Z", "M224,84 L200,108 L248,108Z", "M306,87 L282,113 L330,113Z"],
    mid:  "M0,180 L0,158 L64,142 L176,152 L286,138 L400,152 L400,180Z",
    near: "M0,180 L102,168 L238,162 L400,170 L400,180Z",
  },
  // 5 — Tal: valley view, peaks flanking both sides
  {
    far:  "M0,180 L0,96 L58,62 L114,96 L200,132 L286,90 L342,58 L400,94 L400,180Z",
    snow: ["M58,62 L32,96 L86,96Z", "M342,58 L314,92 L370,92Z"],
    mid:  "M0,180 L0,114 L80,148 L200,144 L326,140 L400,108 L400,180Z",
    near: "M0,180 L0,166 L122,160 L282,158 L400,164 L400,180Z",
  },
];

// Fixed star positions (sky area, y < 90)
const STARS: [number, number, number][] = [
  [28,12,0.30],[58,28,0.20],[95,10,0.35],[145,22,0.18],[188,8,0.28],
  [235,18,0.22],[278,30,0.16],[315,12,0.32],[352,24,0.20],[380,10,0.25],
  [42,42,0.14],[310,38,0.18],[165,35,0.12],[72,55,0.10],[260,48,0.15],
];

function hash(s: string): number {
  return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

export default function ResortScene({
  name,
  className = "",
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const idx = hash(name) % SCENES.length;
  const scene = SCENES[idx];
  // Unique gradient ID per resort to avoid inline-SVG ID collisions
  const gid = `rsg-${name.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

  return (
    <svg
      viewBox="0 0 400 180"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#060809" />
          <stop offset="55%"  stopColor="#0D1319" />
          <stop offset="100%" stopColor="#182029" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="400" height="180" fill={`url(#${gid})`} />

      {/* Stars */}
      {STARS.map(([sx, sy, op], i) => (
        <circle key={i} cx={sx} cy={sy} r={i % 3 === 0 ? 1.0 : 0.65} fill={SNOW} opacity={op} />
      ))}

      {/* Aurora glow — subtle brand accent along mid-sky */}
      <ellipse cx="200" cy="70" rx="180" ry="22" fill="#4FC3F0" opacity="0.05" />

      {/* Far mountains */}
      <path d={scene.far} fill={FAR} />

      {/* Snow caps */}
      {scene.snow.map((d, i) => (
        <path key={i} d={d} fill={SNOW} opacity="0.82" />
      ))}

      {/* Mid mountains */}
      <path d={scene.mid} fill={MID} />

      {/* Near mountains (darkest foreground) */}
      <path d={scene.near} fill={NEAR} />
    </svg>
  );
}
