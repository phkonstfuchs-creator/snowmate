import Header from "../components/Header";
import Footer from "../components/Footer";
import ActionButton from "../components/ui/ActionButton";
export default function NotFound() { return <><Header /><main id="main" className="container not-found"><p className="eyebrow">404 / KURZ VON DER PISTE ABGEKOMMEN.</p><h1>Hier geht’s zurück.</h1><p>Diese Seite gibt es nicht. Dein nächster Bergtag wartet auf der Startseite.</p><ActionButton href="/">Zur Startseite ↗</ActionButton></main><Footer landscape={false} /></>; }
