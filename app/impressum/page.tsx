import type { Metadata } from "next";
import LegalPage from "@/features/legal/LegalPage";
import { OPERATOR } from "@/features/legal/operator";

export const metadata: Metadata = { title: "Impressum · Pistl" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <p lang="en"><em>Legal notice under German law (§ 5 DDG). The operator of Pistl is named below.</em></p>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {OPERATOR.name}
        <br />
        {OPERATOR.business}
        <br />
        {OPERATOR.street}
        <br />
        {OPERATOR.city}
        <br />
        {OPERATOR.country}
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      </p>

      <h2>Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV</h2>
      <p>
        {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Inhalte von Nutzerinnen und Nutzern</h2>
      <p>
        Rides, Chatnachrichten und Profilangaben stammen von den Nutzerinnen und Nutzern selbst. Rechtswidrige
        Inhalte kannst du in der App melden oder per E-Mail an die oben genannte Adresse schicken; wir entfernen
        sie, sobald wir davon erfahren.
      </p>
    </LegalPage>
  );
}
