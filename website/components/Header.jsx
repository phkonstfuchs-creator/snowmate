"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ActionButton from "./ui/ActionButton";

const links = [["Funktionen", "/#entdecken"], ["Warteliste", "/#waitlist"], ["Fragen?", "/#faq"]];

export default function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="container header-inner">
      <Link href="/" className="wordmark" aria-label="Pistl – Startseite">
        pistl
      </Link>
      <nav aria-label="Hauptnavigation" className="desktop-nav">
        {links.map(([text, href]) => <Link key={href} href={href}>{text}</Link>)}
      </nav>
      <ActionButton href="/#waitlist" className="header-cta" variant="text">Zur Warteliste</ActionButton>
      <button type="button" className="menu-toggle" aria-label={open ? "Menü schließen" : "Menü öffnen"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
        {open ? <X /> : <Menu />}
      </button>
    </div>
    {open && <nav id="mobile-nav" aria-label="Mobile Navigation" className="mobile-nav">
      {links.map(([text, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{text}</Link>)}
    </nav>}
  </header>;
}
