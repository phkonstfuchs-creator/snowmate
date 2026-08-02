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
        padding: 0,
        borderRadius: 0,
        background: "var(--paper-0)",
        border: "var(--rule-thin)",
      }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          bottom: 0,
          left: `calc(${activeIndex} * (100% / ${options.length}))`,
          width: `calc(100% / ${options.length})`,
          borderRadius: 0,
          background: "var(--ink-0)",
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
              height: 38,
              font: "700 11px var(--font-mono-stack)",
              letterSpacing: 0,
              textTransform: "uppercase",
              color: active ? "var(--paper-0)" : "var(--ink-2)",
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
