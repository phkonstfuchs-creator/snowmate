import ActionButton from "./ui/ActionButton";
import { JadeSky } from "./ui/JadeSky";
import MountainScene from "./MountainScene";

export default function Hero() {
  return <section className="panorama-hero" aria-labelledby="hero-title">
    <MountainScene />
    <JadeSky className="hero-jade-sky" />
    <div className="container hero-content">
      <h1 id="hero-title">Wer fährt<br/>{" "}heute wohin?</h1>
      <p className="hero-description">Finde deine Crew am Berg, teile eine Fahrt und mach aus der Idee einen Skitag.</p>
      <ActionButton href="#waitlist">Pistl früh testen</ActionButton>
    </div>
    <a href="#entdecken" className="hero-scroll">So funktioniert Pistl</a>
  </section>;
}
