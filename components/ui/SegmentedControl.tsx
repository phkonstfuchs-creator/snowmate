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
        padding: 3,
        borderRadius: 8,
        background: "var(--paper-2)",
      }}
    >
      <div
        className="absolute"
        style={{
          top: 3,
          bottom: 3,
          left: `calc(3px + ${activeIndex} * ((100% - 6px) / ${options.length}))`,
          width: `calc((100% - 6px) / ${options.length})`,
          borderRadius: 6,
          background: "var(--paper-1)",
          boxShadow: "0 1px 2px rgba(32, 45, 39, 0.12)",
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
              font: `${active ? 650 : 500} 14px var(--font-body-stack)`,
              letterSpacing: "-0.01em",
              color: active ? "var(--ink-0)" : "var(--ink-2)",
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
