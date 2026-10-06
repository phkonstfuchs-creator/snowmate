"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { BADGES, type BadgeId, type BadgeRarity } from "./badges";

const INK: Record<BadgeRarity, string> = { common: "var(--ink-1)", rare: "var(--rust)", epic: "var(--ink-0)" };

/* Stamps like a mountain-hut book: earned ones pressed in ink, the rest
   as dashed outlines. Tap one to see what it takes. */
export default function Badges({ earned }: { earned: ReadonlySet<BadgeId> }) {
  const t = useT();
  const [open, setOpen] = useState<BadgeId | null>(null);
  const openBadge = BADGES.find((badge) => badge.id === open);

  return (
    <section className="pt-6" aria-label={t("game.badges")}>
      <div className="flex items-baseline justify-between px-4">
        <h2 className="text-mono-label mb-2" style={{ color: "var(--ink-2)" }}>{t("game.badges")}</h2>
        <span className="text-mono-label" style={{ color: "var(--ink-2)" }}>{earned.size}/{BADGES.length}</span>
      </div>
      <ul className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {BADGES.map((badge, i) => {
          const has = earned.has(badge.id);
          const color = INK[badge.rarity];
          return (
            <li key={badge.id} className="shrink-0" style={{ width: 76 }}>
              <button
                type="button"
                onClick={() => setOpen(open === badge.id ? null : badge.id)}
                aria-expanded={open === badge.id}
                className="flex w-full flex-col items-center gap-1.5"
              >
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 999,
                    transform: has ? `rotate(${[-6, 5, -3, 7, -5, 4][i % 6]}deg)` : "none",
                    border: has ? `2px solid ${color}` : "1.5px dashed var(--paper-3)",
                    boxShadow: has ? `inset 0 0 0 3px var(--paper-0), inset 0 0 0 4px ${color}` : "none",
                  }}
                >
                  <Icon name={badge.icon} size={22} color={has ? color : "var(--ink-3)"} strokeWidth={has ? 1.9 : 1.4} />
                </span>
                <span className="text-center text-[0.65rem] font-semibold leading-tight" style={{ color: has ? "var(--ink-0)" : "var(--ink-3)" }}>
                  <span className="sr-only">{has ? t("game.earned") : t("game.locked")}: </span>
                  {t(`badge.${badge.id}` as MessageKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {openBadge && (
        <p role="status" className="mx-4 mt-2 text-sm" style={{ color: "var(--ink-1)" }}>
          {t(`badge.${openBadge.id}.how` as MessageKey)}
        </p>
      )}
    </section>
  );
}
