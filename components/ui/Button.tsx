"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

/* Gedruckte Blöcke: kantig, Versal-Display-Schrift, harter
   Schattenversatz. Der Druck-Effekt beim Antippen kommt aus
   globals.css (:active verschiebt den Block) — nicht aus JS,
   sonst überschreibt ein Inline-Transform die CSS-Regel. */
const SIZES = {
  sm: { h: 36, pad: "0 14px", font: "600 13px var(--font-body-stack)", gap: 6 },
  md: { h: 48, pad: "0 20px", font: "600 15px var(--font-body-stack)", gap: 8 },
  lg: { h: 56, pad: "0 26px", font: "700 19px var(--font-display-stack)", gap: 10 },
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
      className={`${VARIANT_CLASS[variant]} inline-flex select-none items-center justify-center ${className}`}
      style={{
        height: s.h,
        padding: s.pad,
        font: s.font,
        gap: s.gap,
        borderRadius: 0,
        width: fullWidth ? "100%" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        textTransform: size === "lg" ? "uppercase" : "none",
        letterSpacing: 0,
        transition:
          "transform var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    >
      {icon && iconPosition === "left" ? icon : null}
      {children}
      {icon && iconPosition === "right" ? icon : null}
    </button>
  );
}
