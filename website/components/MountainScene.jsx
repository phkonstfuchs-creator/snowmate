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

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="mountain-scene" ref={scene} aria-hidden="true">
    <Image src="/alpine-panorama.webp" alt="" fill priority sizes="100vw" className="panorama-image panorama-image--distant" />
    <div className="mountain-foreground">
      <Image src="/alpine-panorama.webp" alt="" fill sizes="100vw" className="panorama-image panorama-image--near" />
    </div>
  </div>;
}
