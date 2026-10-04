import { CarFront, CircleUserRound, Snowflake } from "lucide-react";

const capabilities = [
  { number: "01", icon: Snowflake, title: "Rides finden und posten", description: "Sieh, wer aus deiner Crew heute Ski fährt oder snowboardet. Teile dein Gebiet, dein Tempo und wann du loswillst.", detail: "Treffpunkte bleiben den Mitfahrenden vorbehalten." },
  { number: "02", icon: CarFront, title: "Freie Autoplätze teilen", description: "Biete einen Platz an oder frag bei einer Mitfahrt aus deinem vertrauten Kreis an.", detail: "Abfahrtsort, Ziel und freie Plätze auf einen Blick." },
  { number: "03", icon: CircleUserRound, title: "Mit deiner Crew planen", description: "Verabredet euch privat. Wenn ihr euch am Berg finden wollt, schaltest du deinen Standort freiwillig und zeitlich begrenzt frei.", detail: "Du entscheidest, wer deinen Standort sieht." },
];

export default function Features() {
  return <section id="entdecken" className="product-section section-space"><div className="container">
    <div className="product-heading"><h2 className="focus-reveal">Rides, Mitfahrplätze<br/><span>und private Crew.</span></h2><p>Rides, Mitfahrplätze und deine Crew. An einem Ort – für Ski und Snowboard rund um Innsbruck und Salzburg.</p></div>
    <div className="capability-list">{capabilities.map(({number,icon:Icon,title,description,detail})=><article className="capability-row" key={number}>
      <span className="capability-number">{number}</span><Icon className="capability-icon" size={25} strokeWidth={1.6}/><div className="capability-copy"><h3>{title}</h3><p>{description}</p><span>{detail}</span></div>
    </article>)}</div>
  </div></section>;
}
