"use client";

import { useRef, useState } from "react";

const features = [
  { id: "ride", label: "Ride planen", word: "Zusammen\nlos.", title: "Ein Ride. Alle wissen Bescheid.", description: "Skigebiet, Startzeit und Tempo festlegen. Deine Crew sieht, was du vorhast, und kann sich anschließen. Der Plan steht an einem Ort.", details: ["Gebiet auswählen", "Zeit & Tempo festlegen", "Mit der Crew losfahren"], caption: "Aus einer Idee wird euer nächster Skitag." },
  { id: "carpool", label: "Mitfahren", word: "Platz für\nmehr.", title: "Ein freier Sitz ist ein guter Anfang.", description: "Du hast noch Platz im Auto? Biete ihn an. Du brauchst eine Mitfahrt? Finde Abfahrt, Ziel und freie Plätze zusammen an einem Ort.", details: ["Fahrt anbieten oder suchen", "Abfahrt gemeinsam klären", "Zusammen zum Skigebiet"], caption: "Die gemeinsame Fahrt beginnt vor der ersten Abfahrt." },
  { id: "crew", label: "Crew treffen", word: "Da seid\nihr ja.", title: "Andere Piste. Gleiche Crew.", description: "Bleibt in eurer privaten Crew verbunden. Wenn ihr euch am Berg treffen wollt, teilt ihr euren Standort miteinander – genau so lange, wie ihr möchtet.", details: ["Freunde in die Crew holen", "Standort bei Bedarf teilen", "Am Berg wieder zusammenfinden"], caption: "Weniger suchen. Mehr zusammen fahren." },
  { id: "events", label: "Events finden", word: "Noch eine\nRunde?", title: "Ein Anlass, gemeinsam rauszukommen.", description: "Entdecke öffentliche Events und sieh, wann und wo etwas geplant ist. Volljährige können selbst ein Event hosten und andere zum Mitfahren einladen.", details: ["Öffentliche Events entdecken", "Gebiet & Termin ansehen", "Beim passenden Event dabei sein"], caption: "Für Tage, die ihr noch nicht geplant habt." },
];

function FeatureArtwork({ feature }) {
  return <div className={`feature-art feature-art--${feature.id}`} aria-hidden="true">
    <span className="art-label">pistl / {feature.label}</span>
    <span className="art-word">{feature.word}</span>
    {feature.id === "ride" && <div className="ride-ribbons"><span>Dein Gebiet</span><span>Dein Tempo</span><span>Deine Leute</span></div>}
    {feature.id === "carpool" && <div className="seat-grid"><span className="seat seat-driver">Du</span><span className="seat">+1</span><span className="seat">+1</span><span className="seat">+1</span></div>}
    {feature.id === "crew" && <div className="crew-orbit"><span>Du</span><span>Deine</span><span>Crew</span></div>}
    {feature.id === "events" && <div className="event-stamp"><span>Nächster Halt</span><strong>Bergtag</strong><span>Mit guten Leuten</span></div>}
    <span className="art-bottom">{feature.caption}</span>
  </div>;
}

export default function Features() {
  const [active, setActive] = useState(0);
  const tabs = useRef([]);
  const feature = features[active];
  function navigate(event, index) {
    const keys = { ArrowRight: (index + 1) % features.length, ArrowLeft: (index + features.length - 1) % features.length, Home: 0, End: features.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    setActive(keys[event.key]);
    tabs.current[keys[event.key]]?.focus();
  }
  return <section id="entdecken" className="product-section section-space" aria-labelledby="features-heading">
    <div className="container">
      <div className="product-heading" data-scroll-reveal>
        <p className="eyebrow">DEIN TAG AM BERG</p>
        <h2 id="features-heading">Gut, wenn alle<br/><span>denselben Plan haben.</span></h2>
        <p>Wer kommt mit? Wie kommen wir hin? Wo treffen wir uns?<br className="desktop-break"/> Genau dafür gibt es Pistl.</p>
      </div>
      <div className="feature-tabs" role="tablist" aria-label="Pistl Funktionen">
        {features.map((item, index) => <button key={item.id} ref={(element) => { tabs.current[index] = element; }} type="button" role="tab" id={`tab-${item.id}`} aria-selected={active === index} aria-controls="feature-panel" tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => navigate(event, index)}>{item.label}</button>)}
      </div>
      <div className="feature-panel" id="feature-panel" role="tabpanel" aria-labelledby={`tab-${feature.id}`} tabIndex={0}>
        <div className="feature-stage" key={feature.id}><FeatureArtwork feature={feature}/></div>
        <div className="feature-copy" key={`${feature.id}-copy`}>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          <ol>{feature.details.map((detail, index) => <li key={detail}><span aria-hidden="true">{index + 1}</span>{detail}</li>)}</ol>
          <a className="feature-link" href="#waitlist">Beim Start dabei sein <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </div>
  </section>;
}
