"use client";

import { useState } from "react";
import Switch from "@/components/ui/Switch";
import { useT } from "@/lib/i18n/client";
import { setLeaderboardSettingAction } from "./actions";
import type { LeaderboardSettings as Settings } from "./leaderboard";

/* Who sees your season totals: friends (on unless switched off) and the
   regional board (off unless switched on; under 18 always anonymous). */
export default function LeaderboardSettings({ initial, isMinor }: { initial: Settings | null; isMinor: boolean }) {
  const t = useT();
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!settings) return null;

  const change = async (setting: keyof Settings, on: boolean) => {
    setBusy(true);
    setFailed(false);
    const ok = await setLeaderboardSettingAction(setting, on).catch(() => false);
    setBusy(false);
    if (ok) setSettings({ ...settings, [setting]: on });
    else setFailed(true);
  };

  return (
    <section className="px-4 pb-4" aria-busy={busy}>
      <div className="section-rule">
        <h2 className="text-mono-label" style={{ color: "var(--ink-0)" }}>{t("game.settingsTitle")}</h2>
      </div>
      <div className="mt-2 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: "var(--ink-1)" }}>{t("game.showFriends")}</p>
          <Switch on={settings.friends} label={t("game.showFriends")} disabled={busy} onChange={(on) => void change("friends", on)} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm" style={{ color: "var(--ink-1)" }}>{t("game.joinRegion")}</p>
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>{isMinor ? t("game.regionMinor") : t("game.regionAdult")}</p>
          </div>
          <Switch on={settings.region} label={t("game.joinRegion")} disabled={busy} onChange={(on) => void change("region", on)} />
        </div>
      </div>
      {failed && <p role="status" className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t("game.settingsFailed")}</p>}
    </section>
  );
}
