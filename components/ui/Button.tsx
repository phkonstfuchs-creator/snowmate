"use client";

import { ButtonHTMLAttributes } from "react";

/* Printed block: sharp corners, uppercase display type, hard shadow
   offset. The press effect comes from globals.css (:active shifts the
   block), not from JS — an inline transform would override it. */
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
        height: 56,
        padding: "0 26px",
        font: "700 19px var(--font-display-stack)",
        gap: 10,
        borderRadius: 0,
        width: fullWidth ? "100%" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        textTransform: "uppercase",
        letterSpacing: 0,
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
