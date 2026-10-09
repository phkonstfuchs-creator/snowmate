"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    // Content is visible by default, including keyboard and anchor destinations.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-enter");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    document.querySelectorAll("[data-scroll-reveal]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}
