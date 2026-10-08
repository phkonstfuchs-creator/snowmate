"use client";

import { useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Icon from "@/components/ui/Icon";
import type { RidePost } from "@/lib/types";
import type { RideEditInput } from "./ride-input";
import type { RideActionResult } from "./actions";
import { useT } from "@/lib/i18n/client";
import { translateText } from "@/lib/i18n/translate";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const SPOT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 50];

/* Resort, day and audience are fixed after posting; changing those makes
   it a different ride. Everything a host typically corrects is here. */
export default function EditRideSheet({
  post,
  onSave,
  onClose,
}: {
  post: RidePost;
  onSave: (input: RideEditInput) => Promise<RideActionResult>;
  onClose: () => void;
}) {
  useScrollLock();
  const { state, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);
  const t = useT();
  const [meetTime, setMeetTime] = useState(post.meetTime);
  const [meetPoint, setMeetPoint] = useState(post.meetPoint);
  const [totalSpots, setTotalSpots] = useState(post.totalSpots);
  const [caption, setCaption] = useState(post.caption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spotOptions = [...new Set([...SPOT_OPTIONS, post.totalSpots])]
    .filter((n) => n >= Math.max(1, post.takenSpots))
    .sort((a, b) => a - b);

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await onSave({ meetTime, meetPoint, totalSpots, caption });
    setSaving(false);
    if (!result.ok) {
      setError(translateText(t, result.message));
      return;
    }
    dismiss();
  };

  const label = "text-mono-label mb-1.5 block";

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div
        ref={panelRef}
        className="sheet-panel paper-grain"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-ride-title"
        tabIndex={-1}
        style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}
      >
        <div className="flex items-start justify-between px-5 pt-6 pb-4" style={{ borderBottom: "var(--rule-thin)" }}>
          <div>
            <p className="text-mono-label mb-2" style={{ color: "var(--rust)" }}>
              {post.resort} · {post.date}
            </p>
            <h2 id="edit-ride-title" className="text-display-md" style={{ color: INK }}>{t("edit.title")}</h2>
          </div>
          <button type="button" onClick={dismiss} aria-label={t("common.close")} className="-mr-2 flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color={INK} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-5 pt-5">
          {error && (
            <p role="alert" className="px-3 py-2 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="edit-ride-time" className={label} style={{ color: INK }}>{t("post.time")}</label>
              <input id="edit-ride-time" type="time" className="form-input" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} />
            </div>
            <div className="w-28">
              <label htmlFor="edit-ride-spots" className={label} style={{ color: INK }}>{t("post.spots")}</label>
              <select id="edit-ride-spots" className="form-input" value={totalSpots} onChange={(e) => setTotalSpots(Number(e.target.value))}>
                {spotOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="edit-ride-point" className={label} style={{ color: INK }}>{t("post.meetingPoint")}</label>
            <input id="edit-ride-point" className="form-input" maxLength={120} value={meetPoint} onChange={(e) => setMeetPoint(e.target.value)} />
          </div>
          <div>
            <label htmlFor="edit-ride-note" className={label} style={{ color: INK }}>
              {t("post.note")} <span style={{ color: INK_2 }}>{t("common.optional")}</span>
            </label>
            <textarea id="edit-ride-note" aria-describedby="edit-ride-note-count" rows={3} maxLength={280} className="form-input resize-none" value={caption} onChange={(e) => setCaption(e.target.value)} />
              <p id="edit-ride-note-count" className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>{t("common.characterCount", { n: caption.length, max: 280 })}</p>
          </div>
          <p className="text-xs leading-snug" style={{ color: INK_2 }}>
            {t("edit.hint")}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving || meetPoint.trim().length < 2}
            className="card-tap w-full py-4 font-display text-xl disabled:opacity-40"
            style={{ background: "var(--rust)", color: "var(--on-accent)" }}
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </>
  );
}
