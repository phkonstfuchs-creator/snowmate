import Header from "./Header";
import Footer from "./Footer";
import Link from "next/link";

export default function LegalShell({ title, children }) {
  return <><Header /><main id="main" className="container legal-page"><Link href="/">← Zurück zu Pistl</Link><h1>{title}</h1>{children}</main><Footer landscape={false} /></>;
}
