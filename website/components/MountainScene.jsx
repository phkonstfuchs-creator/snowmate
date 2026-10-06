"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export default function MountainScene() {
  const scene = useRef(null);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let look = { x: 0, y: 0 };
    const update = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const progress = preference.matches ? 0 : Math.min(1, Math.max(0, -bounds.top / bounds.height));
      element.style.setProperty("--scene-progress", progress.toFixed(3));
      element.style.setProperty("--look-x", `${look.x * 24}px`);
      element.style.setProperty("--look-y", `${look.y * 14}px`);
      element.style.setProperty("--camera-y", `${look.x * -1.8}deg`);
      element.style.setProperty("--camera-x", `${look.y * 1.2}deg`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const pointer = (event) => {
      if (event.pointerType !== "mouse" || preference.matches) return;
      const bounds = element.getBoundingClientRect();
      look = { x: Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5)), y: Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5)) };
      schedule();
    };
    const reset = () => { look = { x: 0, y: 0 }; schedule(); };
    const hero = element.parentElement;
    hero.addEventListener("pointermove", pointer);
    hero.addEventListener("pointerleave", reset);
    preference.addEventListener("change", reset);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      hero.removeEventListener("pointermove", pointer);
      hero.removeEventListener("pointerleave", reset);
      preference.removeEventListener("change", reset);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="mountain-scene" ref={scene} aria-hidden="true">
    <div className="mountain-world">
      {/* One local image; the snow terrace is a separate near plane. */}
      <Image src="/alpine-panorama.webp" alt="" fill unoptimized preload sizes="100vw" className="panorama-image panorama-image--distant" />
      <div className="mountain-atmosphere" />
      <div className="mountain-foreground">
        <svg className="panorama-image--near" viewBox="0 0 1440 320" preserveAspectRatio="none" focusable="false">
          <path d="M0 36C230 77 356 193 667 180C940 169 1160 54 1440 22V320H0Z" fill="#f4efe4" />
          <g fill="none" stroke="#837d6e" strokeWidth="1" opacity=".17">
            <path d="M-50 73C280 134 419 245 797 201C1080 168 1182 108 1500 81" />
            <path d="M-20 121C241 168 470 285 793 251C1120 216 1252 156 1475 147" />
            <path d="M23 141C194 170 339 229 461 252M1013 225C1150 202 1246 181 1431 172" />
          </g>
        </svg>
      </div>
    </div>
  </div>;
}
