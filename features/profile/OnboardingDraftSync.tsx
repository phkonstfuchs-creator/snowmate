"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { adoptOnboardingDraftAction } from "./actions";
import { ONBOARDING_DRAFT_KEY } from "./profile-input";
import type { DraftAdoptionResult } from "./action-state";

/* Results after which the draft has done its job or can never succeed.
   "handle_taken" keeps it, so the edit sheet can prefill the other
   answers; transient failures keep it for the next visit. */
const FINAL_RESULTS: ReadonlySet<DraftAdoptionResult> = new Set(["saved", "skipped", "invalid"]);

function readDraft(): unknown {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return undefined;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    // Nothing to do: the draft simply stays until storage works again.
  }
}

/* Onboarding happens before the account exists, so its answers wait in
   localStorage. Once the user is signed in, this hands them to the
   server exactly once per page load and then forgets them. */
export default function OnboardingDraftSync() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const draft = readDraft();
    if (draft === null) return;
    if (draft === undefined) {
      clearDraft();
      return;
    }

    adoptOnboardingDraftAction(draft)
      .then((result) => {
        if (FINAL_RESULTS.has(result)) clearDraft();
        if (result === "saved") router.refresh();
      })
      .catch(() => {
        // Network failure: keep the draft and try on the next visit.
      });
  }, [router]);

  return null;
}
