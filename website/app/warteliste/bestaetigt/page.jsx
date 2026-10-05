import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import ActionButton from "../../../components/ui/ActionButton";

export const metadata = { title: "Du bist auf der Warteliste", robots: { index: false, follow: false } };

export default function ConfirmedPage() {
  return <><Header /><main id="main" className="container not-found">
    <p className="eyebrow">WARTELISTE / BESTÄTIGT.</p>
    <h1>Du bist auf der Warteliste.</h1>
    <p>Danke! Wir melden uns per E-Mail, sobald Pistl startet. Hast du Early Access angekreuzt, laden wir dich schrittweise zum Testen ein.</p>
    <ActionButton href="/">Zur Startseite ↗</ActionButton>
  </main><Footer landscape={false} /></>;
}
