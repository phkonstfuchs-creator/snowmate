"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export default function MountainScene() {
  const scene = useRef(null);

  useEffect(() => {
    const element = scene.current;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || motionPreference.matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -bounds.top / Math.max(bounds.height, 1)));
      element.style.setProperty("--scene-progress", progress.toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const pointer = (event) => {
      if (event.pointerType !== "mouse" || motionPreference.matches) return;
      const bounds = element.getBoundingClientRect();
      element.style.setProperty("--look-x", `${((event.clientX - bounds.left) / bounds.width - .5) * 12}px`);
      element.style.setProperty("--look-y", `${((event.clientY - bounds.top) / bounds.height - .5) * 8}px`);
    };
    const reset = () => {
      element.style.setProperty("--look-x", "0px");
      element.style.setProperty("--look-y", "0px");
    };
    const hero = element.parentElement;
    hero.addEventListener("pointermove", pointer);
    hero.addEventListener("pointerleave", reset);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      hero.removeEventListener("pointermove", pointer);
      hero.removeEventListener("pointerleave", reset);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // The 224 KB WebP is already optimized. Covering a tall phone viewport needs
  // its full width; a 100vw responsive candidate would blur the cropped mountain.
  return <div className="mountain-scene" ref={scene} aria-hidden="true">
    <Image src="/alpine-panorama.webp" alt="" fill unoptimized preload sizes="100vw" className="panorama-image panorama-image--distant" />
    <div className="mountain-foreground">
      <Image src="/alpine-panorama.webp" alt="" fill unoptimized sizes="100vw" className="panorama-image panorama-image--near" />
    </div>
  </div>;
}
