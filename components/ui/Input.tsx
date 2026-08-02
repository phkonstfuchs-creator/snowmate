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
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-mono-label" style={{ color: "var(--ink-0)" }}>
          {label}
        </label>
      )}
      <div
        className="flex items-center gap-2.5"
        style={{
          height: 52,
          padding: "0 4px 0 14px",
          borderRadius: 0,
          background: "var(--paper-0)",
          border: `1px solid ${error ? "var(--crimson)" : "var(--ink-0)"}`,
          boxShadow: focused && !error ? "var(--glow-focus)" : "none",
          transition: "box-shadow var(--duration-fast) var(--ease-standard)",
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
          className={`min-w-0 flex-1 border-none bg-transparent outline-none ${className ?? ""}`}
          style={{ font: "var(--text-body)", color: "var(--ink-0)" }}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            disabled={disabled}
            aria-label={revealed ? "Passwort verbergen" : "Passwort anzeigen"}
            aria-pressed={revealed}
            className="flex flex-shrink-0 items-center justify-center self-stretch"
            style={{
              minWidth: 44,
              color: "var(--ink-2)",
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
          className="text-sm"
          style={{ color: error ? "var(--crimson)" : "var(--ink-2)" }}
        >
          {error || helper}
        </span>
      )}
    </div>
  );
}
