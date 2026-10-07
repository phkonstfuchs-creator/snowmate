"use client";

import StatusScreen from "@/components/StatusScreen";

/* Any crash below the root layout ends here instead of a blank page. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusScreen title="status.errorTitle" text="status.errorText" onRetry={reset} />;
}
