import LegalShell from "../../components/LegalShell";
import ActionButton from "../../components/ui/ActionButton";
import { contactEmail, contactPhone } from "../../lib/site";

export const metadata = { title: "Kontakt" };
export default function Contact() {
  return <LegalShell title="Reden wir über Bergtage."><p>Du hast eine Frage zu Pistl, eine Idee oder möchtest das Projekt unterstützen? Pistl entsteht gerade – Feedback gehört dazu.</p>
    <h2>Direkter Kontakt</h2><p>E-Mail: <a href={`mailto:${contactEmail}`}>{contactEmail}</a><br/>Telefon: <a href="tel:+4915116477919">{contactPhone}</a></p>
    <h2>Beim Testen dabei sein</h2><p>Über die Warteliste kannst du Interesse am Early Access anmelden. Sobald erste Tests starten, werden Einladungen schrittweise verschickt.</p><ActionButton href="/#waitlist">Zur Warteliste</ActionButton>
  </LegalShell>;
}
