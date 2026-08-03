"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { signOutAction } from "@/features/auth/actions";
import { PROFILE_DRAFT_KEY } from "./draft-storage";

interface ProfileAccessActionsProps {
  showRetry?: boolean;
}

function clearBrowserDraft(): void {
  window.sessionStorage.removeItem(PROFILE_DRAFT_KEY);
  window.localStorage.removeItem(PROFILE_DRAFT_KEY);
}

export default function ProfileAccessActions({
  showRetry = true,
}: ProfileAccessActionsProps) {
  const router = useRouter();

  return (
    <div className="mt-6 grid gap-2">
      {showRetry ? (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="text-mono-label flex min-h-12 w-full items-center justify-center gap-2"
          style={{
            border: "var(--rule-thin)",
            background: "var(--paper-1)",
            color: "var(--ink-0)",
          }}
        >
          <Icon name="refresh-cw" size={15} />
          Erneut versuchen
        </button>
      ) : null}

      <form action={signOutAction} onSubmit={clearBrowserDraft}>
        <button
          type="submit"
          className="text-mono-label flex min-h-11 w-full items-center justify-center gap-2"
          style={{ color: "var(--ink-2)" }}
        >
          <Icon name="log-out" size={15} />
          Abmelden
        </button>
      </form>
    </div>
  );
}
