interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = true,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      className="relative flex"
      style={{
        width: fullWidth ? "100%" : "fit-content",
        padding: 4,
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface-3)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="absolute"
        style={{
          top: 4,
          bottom: 4,
          left: `calc(${activeIndex} * (100% / ${options.length}) + 4px)`,
          width: `calc(100% / ${options.length} - 8px)`,
          borderRadius: "var(--radius-sm)",
          background: "var(--accent-primary)",
          transition: `left var(--duration-base) var(--ease-standard)`,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="relative z-10 flex-1 flex items-center justify-center transition-colors"
            style={{
              height: 36,
              font: "600 13px var(--font-body)",
              color: active ? "var(--text-on-accent)" : "var(--text-tertiary)",
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
