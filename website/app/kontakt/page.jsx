import LegalShell from "../../components/LegalShell";
import ActionButton from "../../components/ui/ActionButton";
import { contactEmail } from "../../lib/site";

export const metadata = { title: "Kontakt" };
export default function Contact() {
  return <LegalShell title="Reden wir über Bergtage."><p>Du hast eine Frage zu Pistl, eine Idee oder möchtest das Projekt unterstützen? Pistl entsteht gerade – Feedback gehört dazu.</p>
    <h2>Direkter Kontakt</h2>{contactEmail ? <p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p> : <p className="draft-note">Die öffentliche Kontaktadresse steht noch nicht fest und wird vor dem Start ergänzt.</p>}
    <h2>Beim Testen dabei sein</h2><p>Über die Warteliste kannst du Interesse am Early Access anmelden. Sobald erste Tests starten, werden Einladungen schrittweise verschickt.</p><ActionButton href="/#waitlist">Zur Warteliste ↗</ActionButton>
  </LegalShell>;
}
