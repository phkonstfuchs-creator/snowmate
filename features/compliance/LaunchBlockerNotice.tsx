import { LAUNCH_BLOCKER_LABELS, launchBlocker } from "./launch-blockers";
import type { LaunchBlockerId } from "./legal-types";

interface LaunchBlockerNoticeProps {
  blockers: readonly LaunchBlockerId[];
}

export default function LaunchBlockerNotice({
  blockers,
}: LaunchBlockerNoticeProps) {
  return (
    <aside
      role="note"
      aria-labelledby="launch-blocker-title"
      className="mt-8 border-2 px-4 py-4 sm:px-5"
      style={{
        borderColor: "var(--crimson)",
        background: "var(--paper-1)",
      }}
    >
      <h2
        id="launch-blocker-title"
        className="text-mono-label"
        style={{ color: "var(--crimson)" }}
      >
        Vor Veröffentlichung lösen
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Diese technische Vorlage hat keine rechtliche Freigabe. Eine externe
        Beta ist blockiert, solange die folgenden Punkte offen sind.
      </p>
      <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed">
        {blockers.map((blocker) => (
          <li key={blocker} className="list-square">
            <span>{LAUNCH_BLOCKER_LABELS[blocker]}</span>
            <code className="mt-1 block break-all text-xs">
              {launchBlocker(blocker)}
            </code>
          </li>
        ))}
      </ul>
    </aside>
  );
}
