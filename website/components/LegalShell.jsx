import { ArrowLeft } from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import Link from "next/link";

export default function LegalShell({ title, children }) {
  return <><Header /><main id="main" className="container legal-page"><Link href="/"><ArrowLeft size={16} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle" }} /> Zurück zu Pistl</Link><h1>{title}</h1>{children}</main><Footer landscape={false} /></>;
}
