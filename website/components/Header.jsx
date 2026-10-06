"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import ActionButton from "./ui/ActionButton";

const links = [["Entdecken", "/#entdecken"], ["Fragen", "/#faq"]];

export default function Header() {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return <header className="site-header">
    <div className="container header-inner">
      <Link href="/" className="wordmark" aria-label="Pistl – Startseite">pistl<span aria-hidden="true">.</span></Link>
      <nav aria-label="Hauptnavigation" className="desktop-nav">{links.map(([text, href]) => <Link key={href} href={href}>{text}</Link>)}</nav>
      <ActionButton href="/#waitlist" className="header-cta" variant="text">Früh dabei sein</ActionButton>
      <button ref={toggle} type="button" className="menu-toggle" aria-label={open ? "Menü schließen" : "Menü öffnen"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}</button>
    </div>
    <nav id="mobile-nav" aria-label="Mobile Navigation" className="mobile-nav" hidden={!open}>
      {[...links, ["Früh dabei sein", "/#waitlist"]].map(([text, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{text}<span aria-hidden="true"><ArrowUpRight size={18} /></span></Link>)}
    </nav>
  </header>;
}
