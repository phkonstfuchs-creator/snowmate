"use client";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  ariaLabel?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = true,
  ariaLabel = "Options",
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      className="relative flex"
      role="group"
      aria-label={ariaLabel}
      style={{
        width: fullWidth ? "100%" : "fit-content",
        padding: 4,
        borderRadius: 999,
        background: "var(--paper-2)",
      }}
    >
      <div
        className="absolute"
        style={{
          top: 4,
          bottom: 4,
          left: `calc(4px + ${activeIndex} * ((100% - 8px) / ${options.length}))`,
          width: `calc((100% - 8px) / ${options.length})`,
          borderRadius: 999,
          background: "var(--rust)",
          boxShadow: "0 4px 14px rgba(255, 106, 43, 0.35)",
          transition: `left var(--duration-base) var(--ease-standard)`,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="relative z-10 flex-1 flex items-center justify-center transition-colors"
            style={{
              height: 40,
              font: "800 14px var(--font-body-stack)",
              letterSpacing: "-0.01em",
              color: active ? "var(--on-bright)" : "var(--ink-1)",
              transitionDuration: "var(--duration-fast)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
