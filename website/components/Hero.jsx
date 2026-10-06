import { ArrowDown, ArrowUpRight } from "lucide-react";
import ActionButton from "./ui/ActionButton";
import { JadeSky } from "./ui/JadeSky";
import MountainScene from "./MountainScene";

export default function Hero() {
  return <section className="panorama-hero" aria-labelledby="hero-title">
    <MountainScene />
    <JadeSky className="hero-jade-sky" />
    <div className="container hero-content">
      <h1 id="hero-title">Ab auf<br/>{" "}<span>den Berg.</span></h1>
      <p className="hero-description">Plane deinen nächsten Skitag mit Freunden.<br className="desktop-break"/> Finde eine Mitfahrt und los geht’s.</p>
      <ActionButton href="#waitlist">Pistl früh testen <ArrowUpRight className="button-arrow" size={20} aria-hidden="true" /></ActionButton>
    </div>
    <a href="#entdecken" className="hero-scroll">Entdecke Pistl <ArrowDown size={17} aria-hidden="true" /></a>
  </section>;
}
