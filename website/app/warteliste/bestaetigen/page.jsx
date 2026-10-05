import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import ActionButton from "../../../components/ui/ActionButton";

export const metadata = { title: "Anmeldung bestätigen", robots: { index: false, follow: false } };

const problems = {
  1: { title: "Dieser Link gilt nicht mehr.", text: "Er ist abgelaufen oder wurde schon benutzt. Hast du schon bestätigt, stehst du auf der Warteliste. Sonst trag dich einfach noch einmal ein." },
  2: { title: "Das hat gerade nicht geklappt.", text: "Deine Anmeldung konnte nicht bestätigt werden. Öffne den Link aus der E-Mail bitte gleich noch einmal." },
};

/* Opening the link only shows this page; the button confirms. Mail
   scanners that open links cannot confirm on someone's behalf. */
export default async function ConfirmPage({ searchParams }) {
  const { t, fehler } = await searchParams;
  const problem = problems[fehler] ?? (typeof t === "string" && t ? null : problems[1]);
  return <><Header /><main id="main" className="container not-found">
    <p className="eyebrow">WARTELISTE / EIN KLICK NOCH.</p>
    {problem
      ? <><h1>{problem.title}</h1><p>{problem.text}</p><ActionButton href="/#waitlist">Zur Warteliste ↗</ActionButton></>
      : <><h1>Fast geschafft.</h1><p>Bestätige deine Anmeldung, dann bist du auf der Pistl-Warteliste.</p>
        <form method="post" action="/api/waitlist/confirm"><input type="hidden" name="t" value={t} /><ActionButton type="submit">Ja, ich will auf die Warteliste ↗</ActionButton></form></>}
  </main><Footer landscape={false} /></>;
}
