import Link from "next/link";

export default function Footer({ landscape = true }) {
  return <footer className="site-footer">
    <div className="container footer-bottom"><div><Link className="footer-wordmark" href="/">pistl</Link><p>Eine App von Philipp Fuchs.<br/>Für Innsbruck & Salzburg.</p></div><nav aria-label="Rechtliches und Kontakt"><Link href="/kontakt">Kontakt</Link><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link></nav><span className="copyright">© {new Date().getFullYear()} Philipp Fuchs · Pistl</span></div>
    {landscape && <div className="footer-bleed" aria-hidden="true">pistl</div>}
  </footer>;
}
