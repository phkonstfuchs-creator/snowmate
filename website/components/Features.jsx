const features = [
  {
    name: "Ride planen",
    title: "Skigebiet, Startzeit und Tempo festlegen.",
    description: "Erstell einen Ride mit Skigebiet, Startzeit und Tempo. Deine Crew sieht den Plan und kann direkt mitfahren.",
  },
  {
    name: "Platz teilen",
    title: "Freie Plätze finden oder anbieten.",
    description: "Biete freie Sitze an oder steig bei jemandem ein. So wird aus der Anfahrt schon ein Teil vom Skitag.",
  },
  {
    name: "Crew treffen",
    title: "Finde deine Crew im Skigebiet.",
    description: "Teilt euren Live-Standort, wenn ihr euch am Berg treffen wollt. Ihr bestimmt selbst, wann die Freigabe endet.",
  },
];

export default function Features() {
  return <section id="entdecken" className="product-section section-space" aria-labelledby="features-heading">
    <div className="container">
      <div className="product-heading" data-scroll-reveal>
        <div>
          <p className="eyebrow">DREI WEGE ZUM SKITAG</p>
          <h2 id="features-heading">Was du mit Pistl machst</h2>
        </div>
        <p>Erstell einen Ride, teil freie Plätze im Auto und triff deine Crew am Berg – direkt im Browser.</p>
      </div>
      <div className="feature-list">
        {features.map((feature) => <article className="feature-row" key={feature.name} data-scroll-reveal>
          <div className="feature-row-copy">
            <p className="feature-label">{feature.name}</p>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        </article>)}
      </div>
    </div>
  </section>;
}
