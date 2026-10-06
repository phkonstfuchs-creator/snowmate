"use client";

import { ArrowUpRight } from "lucide-react";

import { useState } from "react";
import GondolaCarousel from "./GondolaCarousel";

const features = [
  { id: "ride", label: "Ride planen", title: "Ein Ride. Alle wissen Bescheid.", description: "Skigebiet, Startzeit und Tempo festlegen. Deine Crew sieht, was du vorhast, und kann sich anschließen. Der Plan steht an einem Ort.", details: ["Gebiet auswählen", "Zeit & Tempo festlegen", "Mit der Crew losfahren"] },
  { id: "carpool", label: "Mitfahren", title: "Ein freier Sitz ist ein guter Anfang.", description: "Du hast noch Platz im Auto? Biete ihn an. Du brauchst eine Mitfahrt? Finde Abfahrt, Ziel und freie Plätze zusammen an einem Ort.", details: ["Fahrt anbieten oder suchen", "Abfahrt gemeinsam klären", "Zusammen zum Skigebiet"] },
  { id: "crew", label: "Crew treffen", title: "Andere Piste. Gleiche Crew.", description: "Bleibt in eurer privaten Crew verbunden. Wenn ihr euch am Berg treffen wollt, teilt ihr euren Standort miteinander – genau so lange, wie ihr möchtet.", details: ["Freunde in die Crew holen", "Standort bei Bedarf teilen", "Am Berg wieder zusammenfinden"] },
  { id: "events", label: "Events finden", title: "Ein Anlass, gemeinsam rauszukommen.", description: "Entdecke öffentliche Events und sieh, wann und wo etwas geplant ist. Volljährige können selbst ein Event hosten und andere zum Mitfahren einladen.", details: ["Öffentliche Events entdecken", "Gebiet & Termin ansehen", "Beim passenden Event dabei sein"] },
];

export default function Features() {
  const [active, setActive] = useState(0);
  const feature = features[((active % features.length) + features.length) % features.length];
  return <section id="entdecken" className="product-section section-space" aria-labelledby="features-heading">
    <div className="container">
      <div className="product-heading" data-scroll-reveal>
        <p className="eyebrow">DEIN TAG AM BERG</p>
        <h2 id="features-heading">Gut, wenn alle<br/><span>denselben Plan haben.</span></h2>
        <p>Wer kommt mit? Wie kommen wir hin? Wo treffen wir uns?<br className="desktop-break"/> Genau dafür gibt es Pistl.</p>
      </div>
      <div className="feature-panel" id="feature-panel" role="region" aria-label={feature.label}>
        <GondolaCarousel items={features} active={active} onChange={setActive}/>
        <div className="feature-copy" key={`${feature.id}-copy`}>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          <ol>{feature.details.map((detail, index) => <li key={detail}><span aria-hidden="true">{index + 1}</span>{detail}</li>)}</ol>
          <a className="feature-link" href="#waitlist">Beim Start dabei sein <span aria-hidden="true"><ArrowUpRight size={18} /></span></a>
        </div>
      </div>
    </div>
  </section>;
}
