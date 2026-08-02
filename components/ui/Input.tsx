"use client";

import { InputHTMLAttributes, ReactNode, Ref, useId, useState } from "react";
import Icon from "./Icon";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  helper?: string;
  ref?: Ref<HTMLInputElement>;
}

export default function Input({
  ref,
  label,
  icon,
  error,
  helper,
  disabled,
  className,
  type = "text",
  id: providedId,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const messageId = `${id}-message`;
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

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
          padding: "0 8px 0 16px",
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
          ref={ref}
          id={id}
          type={inputType}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={error ? true : undefined}
          aria-describedby={helper || error ? messageId : undefined}
          className={`flex-1 bg-transparent outline-none border-none ${className ?? ""}`}
          style={{ font: "var(--text-body)", color: "var(--text-primary)" }}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            disabled={disabled}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              alignSelf: "stretch",
              minWidth: 44,
              color: "var(--text-tertiary)",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <Icon name={revealed ? "eye-off" : "eye"} size={18} />
          </button>
        ) : null}
      </div>
      {(helper || error) && (
        <span
          id={messageId}
          role={error ? "alert" : undefined}
          style={{ font: "var(--text-body-sm)", color: error ? "var(--status-danger)" : "var(--text-tertiary)" }}
        >
          {error || helper}
        </span>
      )}
    </div>
  );
}
