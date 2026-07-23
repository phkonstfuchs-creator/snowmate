"use client";

import { InputHTMLAttributes, ReactNode, useId, useState } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  helper?: string;
}

export default function Input({ label, icon, error, helper, disabled, className, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-caption" style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>
          {label}
        </label>
      )}
      <div
        className="flex items-center gap-2.5"
        style={{
          height: 52,
          padding: "0 16px",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-surface-3)",
          border: `1px solid ${error ? "var(--status-danger)" : focused ? "var(--accent-primary)" : "var(--border-subtle)"}`,
          boxShadow: focused && !error ? "var(--glow-focus)" : "none",
          transition: `border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)`,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon}
        <input
          id={id}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex-1 bg-transparent outline-none border-none ${className ?? ""}`}
          style={{ font: "var(--text-body)", color: "var(--text-primary)" }}
          {...rest}
        />
      </div>
      {(helper || error) && (
        <span style={{ font: "var(--text-body-sm)", color: error ? "var(--status-danger)" : "var(--text-tertiary)" }}>
          {error || helper}
        </span>
      )}
    </div>
  );
}
