"use client";

import { ButtonHTMLAttributes } from "react";

/* The one primary button: rust, rounded (usability pass 2026-10-07). The press effect comes from
   globals.css (:active scales it), not from JS — an inline transform
   would override it. */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export default function Button({
  fullWidth = false,
  disabled,
  children,
  className = "",
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`sm-btn-primary inline-flex select-none items-center justify-center ${className}`}
      style={{
        height: 52,
        padding: "0 22px",
        font: "600 16px var(--font-body-stack)",
        gap: 10,
        borderRadius: 14,
        width: fullWidth ? "100%" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        letterSpacing: "-0.01em",
        transition:
          "transform var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
