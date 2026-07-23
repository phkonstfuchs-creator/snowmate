"use client";
import { useEffect } from "react";

export function useScrollLock() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".page-content");
    if (!el) return;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, []);
}
