"use client";

import { AbilityLevel } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import Icon from "./Icon";

const LEVEL: Record<AbilityLevel, { label: MessageKey; cls: string; icon: string }> = {
  chill: { label: "common.chill", cls: "badge-chill", icon: "sun" },
  park: { label: "common.park", cls: "badge-park", icon: "zap" },
  "off-piste": { label: "common.offPiste", cls: "badge-offpiste", icon: "mountain-snow" },
};

export default function Tag({ level, showIcon = true }: { level: AbilityLevel; showIcon?: boolean }) {
  const s = LEVEL[level];
  const t = useT();
  return (
    <span
      className={`inline-flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${s.cls}`}
      style={{
        height: 24,
        padding: "0 9px",
        borderRadius: 999,
        background: "var(--paper-2)",
        color: "var(--ink-1)",
        font: "600 12px var(--font-body-stack)",
      }}
    >
      {showIcon && <Icon name={s.icon} size={12} />}
      {t(s.label)}
    </span>
  );
}
