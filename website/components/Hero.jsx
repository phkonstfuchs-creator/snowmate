import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import ActionButton from "./ui/ActionButton";

export default function Hero() {
  return <section className="panorama-hero" aria-labelledby="hero-title">
    <Image src="/alpine-panorama.webp" alt="" fill priority sizes="100vw" className="panorama-image"/>
    <div className="container hero-content">
      <p className="hero-location">Für Ski & Snowboard. Innsbruck & Salzburg.</p>
      <h1 id="hero-title">Wer fährt mit?</h1>
      <p className="hero-description">Sieh, wer aus deiner Crew wo fährt.<br/>Finde einen Ride und einen Platz im Auto.</p>
      <ActionButton href="#waitlist">Bald mit Pistl testen <ArrowUpRight size={19}/></ActionButton>
      <p className="hero-stage">Ab 14 · Web-App in Entwicklung</p>
    </div>
    <a href="#entdecken" className="hero-scroll">Pistl kennenlernen <ArrowDown size={17}/></a>
  </section>;
}
