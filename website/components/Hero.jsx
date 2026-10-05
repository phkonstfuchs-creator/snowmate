import ActionButton from "./ui/ActionButton";
import { JadeSky } from "./ui/JadeSky";
import MountainScene from "./MountainScene";

export default function Hero() {
  return <section className="panorama-hero" aria-labelledby="hero-title">
    <MountainScene />
    <JadeSky className="hero-jade-sky" />
    <div className="container hero-content">
      <h1 id="hero-title">Wer fährt<br/>{" "}<span>heute wohin?</span></h1>
      <p className="hero-description">Deine Leute. Ein freier Platz. Ein Plan für den Berg.<br className="desktop-break"/> Finde mit Pistl zusammen, bevor es losgeht.</p>
      <ActionButton href="#waitlist">Pistl früh testen <span className="button-arrow" aria-hidden="true">↗</span></ActionButton>
    </div>
    <a href="#entdecken" className="hero-scroll">Entdecke Pistl <span aria-hidden="true">↓</span></a>
  </section>;
}
