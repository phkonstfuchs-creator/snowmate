import { ShieldCheck, LockKeyhole, MapPin } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Features from "../components/Features";
import WaitlistForm from "../components/WaitlistForm";

export const metadata = { alternates: { canonical: "/" } };
const faqs = [
  ["Was ist Pistl?", "Pistl wird eine Web-App für Skifahrer und Snowboarder ab 14 rund um Innsbruck und Salzburg. Du siehst, wer wohin fährt, planst Rides mit deiner Crew und findest Mitfahrgelegenheiten."],
  ["Wann kann ich Pistl ausprobieren?", "Die App ist noch in Entwicklung. Erste Tests starten bald. Auf der Warteliste erfährst du vom Start; mit der Early-Access-Option kannst du zusätzlich Interesse am frühen Testen anmelden. Einladungen werden schrittweise verschickt. Einen festen Termin gibt es noch nicht."],
  ["Brauche ich dafür den App Store?", "Nein. Pistl wird zunächst als Web-App direkt im Browser funktionieren – auch auf dem Smartphone. Ein Download aus dem App Store ist dafür nicht nötig."],
  ["Kann ich Pistl unter 18 nutzen?", "Pistl ist ab 14 geplant. Für Minderjährige gelten strengere Schutzregeln: Kontakte und gemeinsame Fahrten bleiben im vertrauten Kreis. Öffentliche Events können nur Volljährige hosten."],
  ["Wer kann meinen Standort sehen?", "Die geplante Standortfreigabe ist freiwillig, nur für Freunde und zeitlich begrenzt. Du kannst sie jederzeit beenden. Treffpunkte eines Rides sehen nur Personen, die dabei sind."],
  ["Was bedeutet Early Access?", "Du testest eine frühe Version und kannst mit deinem Feedback helfen, Pistl besser zu machen. Einzelne Funktionen können noch fehlen oder sich ändern. Deine Anmeldung ist eine Interessenbekundung und garantiert keinen sofortigen Zugang."],
  ["Startet Pistl auch in anderen Regionen?", "Wir konzentrieren uns zuerst auf Innsbruck und Salzburg, damit dort echte Crews entstehen. Weitere Regionen sind eine mögliche nächste Etappe."],
];

export default function Home() {
  return <><Header /><main id="main">
    <Hero />
    <Features />
    <section id="sicherheit" className="safety-section section-space"><div className="container"><div className="safety-heading"><h2>Wer sieht was?</h2><p>Diese Schutzregeln sind für Pistl vorgesehen.</p></div><div className="safety-grid">
      <article><ShieldCheck size={27} strokeWidth={1.5} /><h3>Unter 18: nur dein Kreis.</h3><p>Ab 14 dabei. Für Minderjährige bleiben Kontakte im vertrauten Kreis – ohne Kontaktaufnahme durch Fremde.</p></article>
      <article><MapPin size={27} strokeWidth={1.5} /><h3>Standort bleibt deine Sache.</h3><p>Standort nur für Freunde, freiwillig und auf Zeit. Treffpunkte sehen ausschließlich Teilnehmende.</p></article>
      <article><LockKeyhole size={27} strokeWidth={1.5} /><h3>Kontrolle über Kontakte.</h3><p>2-Faktor-Login, Melden und Blockieren sind vorgesehen. Öffentliche Events hosten dürfen nur Personen ab 18.</p></article>
    </div></div></section>
    <section id="waitlist" className="signup-section section-space"><div className="container signup-grid"><div><p className="eyebrow">WARTELISTE & EARLY ACCESS</p><h2>Als Erste<br/>ausprobieren.</h2><p>Erfahre per E-Mail, wenn Pistl startet. Mit Early Access kannst du schon vorher testen und Feedback geben.</p><p className="founder-note">Ich bin Philipp Fuchs, 17, und baue Pistl für junge Skifahrer und Snowboarder rund um Innsbruck und Salzburg. Die ersten Tests starten bald. Ein fester Termin steht noch nicht fest.</p></div><div className="signup-card"><WaitlistForm /></div></div></section>
    <section id="faq" className="faq-section section-space"><div className="container faq-grid"><div><h2>Noch Fragen?</h2></div><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
  </main><Footer /></>;
}
