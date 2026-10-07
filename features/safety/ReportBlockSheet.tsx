"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Icon from "@/components/ui/Icon";
import { settle } from "@/lib/settle";
import { blockUserAction, reportUserAction, type SafetyActionResult } from "./actions";
import { MAX_REPORT_DETAILS, REPORT_REASONS, type ReportReason, type SafetyTarget } from "./reports";
import { useT } from "@/lib/i18n/client";
import { OPERATOR } from "@/features/legal/operator";
import { translateText } from "@/lib/i18n/translate";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const CRIMSON = "var(--crimson)";
const OFFLINE: SafetyActionResult = { ok: false, message: "common.offline" };

export default function ReportBlockSheet({ target, onClose }: { target: SafetyTarget; onClose: () => void }) {
  useScrollLock();
  const t = useT();
  const router = useRouter();
  const { state, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [mode, setMode] = useState<"choose" | "report">("choose");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SafetyActionResult | null>(null);
  const [, startTransition] = useTransition();

  const finish = (outcome: SafetyActionResult) => {
    setResult(outcome);
    if (outcome.ok) startTransition(() => router.refresh());
  };

  const block = async () => {
    if (!window.confirm(t("safety.confirmBlock", { name: target.name }))) return;
    setPending(true);
    finish(await settle(blockUserAction(target.userId), OFFLINE));
    setPending(false);
  };

  const report = async () => {
    if (!reason) return;
    setPending(true);
    finish(
      await settle(
        reportUserAction({ userId: target.userId, reason, details, alsoBlock, ...(target.rideId ? { rideId: target.rideId } : {}) }),
        OFFLINE,
      ),
    );
    setPending(false);
  };

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div
        ref={panelRef}
        className="sheet-panel paper-grain"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-title"
        tabIndex={-1}
        style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}
      >
        <div className="flex items-start justify-between px-5 pt-6 pb-4" style={{ borderBottom: "var(--rule-thin)" }}>
          <div>
            <p className="text-mono-label mb-2" style={{ color: "var(--rust)" }}>{target.name}</p>
            <h2 id="safety-title" className="text-display-md" style={{ color: INK }}>
              {mode === "report" ? t("safety.report") : t("safety.reportOrBlock")}
            </h2>
          </div>
          <button type="button" onClick={dismiss} aria-label={t("common.close")} className="-mr-2 flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color={INK} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-5 pt-5">
          {result ? (
            <>
              <p role="status" className="text-base" style={{ color: result.ok ? INK : CRIMSON }}>{translateText(t, result.message)}</p>
              <button type="button" onClick={dismiss} className="w-full py-4 font-display text-lg uppercase" style={{ background: INK, color: "var(--paper-0)" }}>
                {t("common.done")}
              </button>
            </>
          ) : mode === "choose" ? (
            <>
              <p className="text-sm leading-relaxed" style={{ color: INK_2 }}>
                {t("safety.unsafeHint")}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: INK_2 }}>
                {t("safety.contactBefore")}
                <a href={`mailto:${OPERATOR.email}?subject=Pistl%20Meldung`} className="font-semibold underline">{OPERATOR.email}</a>
                {t("safety.contactAfter")}
              </p>
              <button
                type="button"
                onClick={() => setMode("report")}
                className="flex min-h-12 w-full items-center justify-between px-4 text-left font-semibold"
                style={{ border: "var(--rule-thin)", color: INK }}
              >
                {t("safety.reportName", { name: target.name })}
                <Icon name="chevron-right" size={16} color={INK} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={block}
                disabled={pending}
                className="flex min-h-12 w-full items-center justify-between px-4 text-left font-semibold disabled:opacity-50"
                style={{ border: `1px solid ${CRIMSON}`, color: CRIMSON }}
              >
                {t("safety.blockName", { name: target.name })}
                <Icon name="user-x" size={16} color={CRIMSON} strokeWidth={2} />
              </button>
              <p className="text-xs leading-snug" style={{ color: INK_2 }}>
                {t("safety.blockHint")}
              </p>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="text-mono-label mb-2" style={{ color: INK }}>{t("safety.whatHappened")}</legend>
                <div className="space-y-2">
                  {REPORT_REASONS.map((option) => (
                    <label key={option.id} className="flex min-h-11 items-center gap-3 px-3" style={{ border: "var(--rule-thin)" }}>
                      <input type="radio" name="reason" value={option.id} checked={reason === option.id} onChange={() => setReason(option.id)} />
                      <span className="text-sm" style={{ color: INK }}>{t(option.label)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="report-details" className="text-mono-label mb-1.5 block" style={{ color: INK }}>
                  {t("safety.details")} <span style={{ color: INK_2 }}>{t("common.optional")}</span>
                </label>
                <textarea
                  id="report-details"
                  rows={3}
                  maxLength={MAX_REPORT_DETAILS}
                  className="form-input resize-none"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
                <span className="text-sm" style={{ color: INK }}>{t("safety.alsoBlock", { name: target.name })}</span>
              </label>
              <button
                type="button"
                onClick={report}
                disabled={!reason || pending}
                className="w-full py-4 font-display text-lg uppercase disabled:opacity-40"
                style={{ background: CRIMSON, color: "var(--paper-0)", border: "var(--rule-thick)" }}
              >
                {pending ? t("safety.sending") : t("safety.send")}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
