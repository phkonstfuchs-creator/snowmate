"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

const SIZES = {
  sm: { h: 36, pad: "0 14px", font: "600 13px var(--font-body)", gap: 6, radius: "var(--radius-md)" },
  md: { h: 48, pad: "0 20px", font: "600 15px var(--font-body)", gap: 8, radius: "var(--radius-lg)" },
  lg: { h: 56, pad: "0 26px", font: "700 17px var(--font-body)", gap: 10, radius: "var(--radius-lg)" },
};

const VARIANT_CLASS: Record<string, string> = {
  primary: "sm-btn-primary",
  secondary: "sm-btn-secondary",
  ghost: "sm-btn-ghost",
  warm: "sm-btn-warm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "warm";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  children,
  className = "",
  style,
  ...rest
}: ButtonProps) {
  const s = SIZES[size];
  return (
    <button
      disabled={disabled}
      className={`${VARIANT_CLASS[variant]} inline-flex items-center justify-center select-none ${className}`}
      style={{
        height: s.h,
        padding: s.pad,
        font: s.font,
        gap: s.gap,
        borderRadius: s.radius,
        width: fullWidth ? "100%" : undefined,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: `transform var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)`,
        letterSpacing: "0.01em",
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.96)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onTouchStart={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.96)"; }}
      onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {icon && iconPosition === "left" ? icon : null}
      {children}
      {icon && iconPosition === "right" ? icon : null}
    </button>
  );
}
