import Header from "../components/Header";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Features from "../components/Features";
import WaitlistForm from "../components/WaitlistForm";
import ScrollReveal from "../components/ScrollReveal";

export const metadata = { alternates: { canonical: "/" } };
const faqs = [
  ["Was ist Pistl?", "Pistl wird eine Web-App für Skifahrer und Snowboarder ab 14 rund um Innsbruck und Salzburg. Du siehst, wer wohin fährt, planst Rides mit deiner Crew und findest Mitfahrgelegenheiten."],
  ["Wann kann ich Pistl ausprobieren?", "Die App ist noch in Entwicklung. Erste Tests starten bald. Auf der Warteliste erfährst du vom Start; mit der Early-Access-Option kannst du zusätzlich Interesse am frühen Testen anmelden. Einladungen werden schrittweise verschickt. Einen festen Termin gibt es noch nicht."],
  ["Brauche ich dafür den App Store?", "Nein. Pistl wird zunächst als Web-App direkt im Browser funktionieren – auch auf dem Smartphone. Ein Download aus dem App Store ist dafür nicht nötig."],
  ["Kann ich Pistl unter 18 nutzen?", "Pistl ist ab 14. Wenn du minderjährig bist, kannst du nur mit Leuten aus deinem vertrauten Kreis in Kontakt kommen und gemeinsam fahren. Fremde Erwachsene können dich nicht anschreiben. Öffentliche Events hosten dürfen nur Volljährige."],
  ["Wer kann meinen Standort sehen?", "Du teilst deinen Live-Standort freiwillig, nur mit deiner Crew und für eine begrenzte Zeit. Du kannst die Freigabe jederzeit beenden. Den Treffpunkt eines Rides sehen nur die Personen, die dabei sind."],
  ["Wie schützt Pistl mein Konto?", "Pistl plant einen Login mit Zwei-Faktor-Schutz. Wenn sich jemand danebenbenimmt, kannst du die Person melden oder blockieren."],
  ["Was bedeutet Early Access?", "Du testest eine frühe Version und kannst mit deinem Feedback helfen, Pistl besser zu machen. Einzelne Funktionen können noch fehlen oder sich ändern. Deine Anmeldung ist eine Interessenbekundung und garantiert keinen sofortigen Zugang."],
  ["Startet Pistl auch in anderen Regionen?", "Wir konzentrieren uns zuerst auf Innsbruck und Salzburg, damit dort echte Crews entstehen. Weitere Regionen sind eine mögliche nächste Etappe."],
];

export default function Home() {
  return <><ScrollReveal /><Header /><main id="main">
    <Hero />
    <Features />
    <section id="waitlist" className="signup-section section-space"><div className="container signup-grid"><div data-scroll-reveal><p className="eyebrow">WARTELISTE & EARLY ACCESS</p><h2>Pistl startet<br/>bald.</h2><p>Trag dich ein und wir mailen dir, sobald erste Tests starten. Mit Early Access kannst du schon während der Entwicklung dabei sein.</p><p className="founder-note">Ich bin Philipp Fuchs, 17, und entwickle Pistl für Skifahrer und Snowboarder in Innsbruck und Salzburg.</p></div><div className="signup-card" data-scroll-reveal><WaitlistForm /></div></div></section>
    <section id="faq" className="faq-section section-space"><div className="container faq-grid" data-scroll-reveal><div><h2>Noch Fragen?</h2></div><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
  </main><Footer /></>;
}
