"use client";

/* An on/off switch. Rounded through inline styles so the shape layer in
   globals.css (which rounds bordered blocks less) leaves it a pill. */
export default function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="relative h-7 w-12 shrink-0 transition-colors disabled:opacity-50"
      style={{ background: on ? "var(--rust)" : "var(--paper-2)", borderRadius: 9999, boxShadow: on ? "none" : "inset 0 0 0 1px var(--border-rule)" }}
    >
      <span
        className="absolute top-1 h-5 w-5 transition-all"
        style={{ left: on ? "calc(100% - 1.5rem)" : "0.25rem", background: on ? "var(--on-accent)" : "var(--ink-2)", borderRadius: 9999 }}
      />
    </button>
  );
}
