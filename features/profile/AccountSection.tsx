"use client";

import { useActionState, useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Icon from "@/components/ui/Icon";
import { deleteAccountAction } from "./account-actions";
import { DELETE_CONFIRMATION, initialDeleteAccountState } from "./action-state";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const CRIMSON = "var(--crimson)";

function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
  useScrollLock();
  const { state: sheetState, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialDeleteAccountState);
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === DELETE_CONFIRMATION;

  return (
    <>
      <div className="sheet-overlay" data-state={sheetState} onClick={dismiss} aria-hidden />
      <div
        ref={panelRef}
        className="sheet-panel paper-grain"
        data-state={sheetState}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        tabIndex={-1}
        style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}
      >
        <div className="flex items-start justify-between px-5 pt-6 pb-4" style={{ borderBottom: "var(--rule-thin)" }}>
          <h2 id="delete-account-title" className="text-display-md" style={{ color: INK }}>
            Delete account
          </h2>
          <button type="button" onClick={dismiss} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color={INK} strokeWidth={2} />
          </button>
        </div>

        <form action={formAction} className="space-y-4 px-5 pt-5">
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-1)" }}>
            This removes your profile, your rides and carpools, everyone you
            joined and every friendship, right away. It cannot be undone.
            Download your data first if you want to keep a copy.
          </p>
          <div>
            <label htmlFor="delete-account-confirm" className="text-mono-label mb-1.5 block" style={{ color: INK }}>
              Type &ldquo;{DELETE_CONFIRMATION}&rdquo; to confirm
            </label>
            <input
              id="delete-account-confirm"
              name="confirmation"
              className="form-input"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-sm" style={{ color: CRIMSON }}>
            {state.status === "error" ? state.message : ""}
          </p>
          <button
            type="submit"
            disabled={!confirmed || pending}
            className="w-full py-4 font-display text-lg uppercase disabled:opacity-40"
            style={{ background: CRIMSON, color: "var(--paper-0)", border: "var(--rule-thick)" }}
          >
            {pending ? "Deleting…" : "Delete my account"}
          </button>
        </form>
      </div>
    </>
  );
}

/* Signed-in only: the account rights every EU user has. */
export default function AccountSection() {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <section className="px-4 pb-4">
      <div className="section-rule">
        <h2 className="text-mono-label" style={{ color: INK }}>Your data</h2>
      </div>
      <div className="mt-2 space-y-2">
        <a
          href="/profile/export"
          download
          className="text-mono-label flex min-h-12 w-full items-center justify-center gap-2"
          style={{ border: "var(--rule-thin)", color: INK, background: "var(--paper-1)" }}
        >
          <Icon name="download" size={15} />
          Download my data
        </a>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="text-mono-label flex min-h-12 w-full items-center justify-center gap-2"
          style={{ color: INK_2 }}
        >
          <Icon name="trash-2" size={15} />
          Delete account
        </button>
      </div>
      {showDelete && <DeleteAccountSheet onClose={() => setShowDelete(false)} />}
    </section>
  );
}
