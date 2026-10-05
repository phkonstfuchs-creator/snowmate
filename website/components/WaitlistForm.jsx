"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, LoaderCircle, Copy } from "lucide-react";
import ActionButton from "./ui/ActionButton";

export default function WaitlistForm() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const pending = useRef(false);
  const confirmation = useRef(null);

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const values = new FormData(event.currentTarget);
    pending.current = true;
    setStatus("pending");
    setError("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.get("email"), earlyAccess: values.get("earlyAccess") === "on", consent: values.get("consent") === "on", website: values.get("website") || "" }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.error || "Die Anmeldung hat gerade nicht geklappt. Bitte versuche es erneut.");
      setStatus("success");
      requestAnimationFrame(() => confirmation.current?.focus());
    } catch (cause) {
      setStatus("error");
      setError(cause.name === "TimeoutError" || cause.name === "TypeError" ? "Die Verbindung hat gerade nicht geklappt. Deine Eingabe bleibt hier – versuche es bitte noch einmal." : cause.message);
    } finally { pending.current = false; }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setShareStatus("Link kopiert. Ab damit in deine Crew!");
    } catch { setShareStatus("Kopiere die Adresse dieser Website und teile sie mit deiner Crew."); }
  }

  if (status === "success") return <div className="signup-success" role="status">
    <span className="success-check"><Check size={30} /></span>
    <h3 ref={confirmation} tabIndex={-1}>Fast geschafft – schau in dein Postfach.</h3>
    <p>Mit dem Link in unserer E-Mail bestätigst du deine Anmeldung. Erst dann stehst du auf der Warteliste. Keine Mail da? Schau im Spam-Ordner nach. Bist du schon bestätigt, musst du nichts weiter tun.</p>
    <button type="button" className="text-button" onClick={share}><Copy size={17} /> Mit deiner Crew teilen</button>
    <p className="form-note" aria-live="polite">{shareStatus}</p>
  </div>;

  return <form method="post" action="/api/waitlist" onSubmit={submit} aria-label="Pistl Warteliste" className="waitlist-form" aria-busy={status === "pending"}>
    <label htmlFor="waitlist-email" className="input-label">Deine E-Mail-Adresse</label>
    <div className="signup-row">
      <input id="waitlist-email" name="email" type="email" placeholder="du@beispiel.at" autoComplete="email" maxLength={254} required aria-describedby={error ? "signup-error" : "signup-note"} />
      <ActionButton type="submit" disabled={status === "pending"}>{status === "pending" ? <><LoaderCircle size={18} className="loading-spinner" /> Wird eingetragen …</> : <>Auf die Warteliste <ArrowUpRight size={19} /></>}</ActionButton>
    </div>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website-field">Website</label><input id="website-field" name="website" tabIndex={-1} autoComplete="off" /></div>
    <label className="checkbox-row"><input type="checkbox" name="earlyAccess" /><span>Ich möchte auch am Early Access teilnehmen.</span></label>
    <label className="checkbox-row consent-row"><input type="checkbox" name="consent" required /><span>Ich möchte per E-Mail über den Pistl-Start und ggf. Early Access informiert werden. Meine Einwilligung kann ich jederzeit widerrufen. <Link href="/datenschutz">Datenschutz</Link></span></label>
    <p id="signup-note" className="form-note">Für Bergmenschen ab 14. Early Access startet bald.</p>
    {error && <p id="signup-error" role="alert" className="form-error">{error}</p>}
  </form>;
}
