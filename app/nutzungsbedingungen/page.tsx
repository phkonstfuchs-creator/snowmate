import type { Metadata } from "next";
import LegalPage from "@/features/legal/LegalPage";
import { OPERATOR } from "@/features/legal/operator";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Nutzungsbedingungen · Pistl" };

/* Terms of use with zero tolerance for objectionable content (App Store
   guideline 1.2, ADR 0034). Accepted at sign-up; the version is in
   features/legal/terms.ts. The wording awaits the owner's legal review. */
export default async function TermsPage() {
  const locale = await getLocale();
  return locale === "en" ? <TermsEn /> : <TermsDe />;
}

function TermsDe() {
  return (
    <LegalPage title="Nutzungsbedingungen">
      <p>Stand: {OPERATOR.updated}</p>

      <h2>1. Worum es geht</h2>
      <p>
        Pistl hilft dir, Skitage mit deiner Crew zu planen. Pistl betreibt {OPERATOR.name}, {OPERATOR.city},{" "}
        {OPERATOR.country}. Mit deinem Konto akzeptierst du diese Regeln.
      </p>

      <h2>2. Wer mitmachen darf</h2>
      <p>
        Du bist mindestens 14 Jahre alt und gibst dein echtes Geburtsdatum an. Es entscheidet, was du siehst und wer
        dich sieht. Ein Konto gehört einer Person.
      </p>

      <h2>3. Null Toleranz</h2>
      <p>Auf Pistl gibt es keinen Platz für:</p>
      <ul>
        <li>Beleidigungen, Hass oder Hetze gegen Menschen oder Gruppen</li>
        <li>Belästigung, Mobbing, Drohungen oder Stalking</li>
        <li>sexuelle Inhalte, Nacktbilder oder Annäherungsversuche an Minderjährige</li>
        <li>Gewalt, Aufrufe zur Selbstverletzung, Drogen- oder Waffenhandel</li>
        <li>Spam, Werbung, Betrug oder falsche Profile</li>
        <li>Fotos oder Daten anderer ohne ihre Erlaubnis</li>
      </ul>
      <p>
        Solche Inhalte entfernen wir, und wer gegen diese Regeln verstößt, wird gesperrt. Wir prüfen jede Meldung
        innerhalb von 24 Stunden.
      </p>

      <h2>4. Melden und Blockieren</h2>
      <p>
        Jede Person kannst du an ihrem Ride, ihrem Post, im Chat oder in deiner Crew melden oder blockieren. Ein
        gemeldeter Post verschwindet für dich sofort. Blockieren wirkt in beide Richtungen und beendet jede Verbindung.
        Im Notfall ruf 112 an. Für Missbrauch erreichst du uns unter{" "}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
      </p>

      <h2>5. Treffen und Mitfahrgelegenheiten</h2>
      <p>
        Pistl bringt Leute zusammen, organisiert aber keine Fahrten und prüft niemanden. Du entscheidest selbst, mit wem
        du fährst. Sag jemandem Bescheid, wohin und mit wem du unterwegs bist, und fahr nur, wenn du dich sicher fühlst.
      </p>

      <h2>6. Deine Inhalte</h2>
      <p>
        Was du postest, gehört dir. Du erlaubst Pistl, es den Personen zu zeigen, die es nach den Regeln der App sehen
        dürfen. Du löschst es jederzeit, mit deinem Konto auch alles andere.
      </p>

      <h2>7. Ende</h2>
      <p>
        Du kannst dein Konto jederzeit im Profil löschen. Wir können ein Konto sperren oder löschen, wenn es gegen diese
        Regeln verstößt.
      </p>

      <h2>8. Änderungen</h2>
      <p>
        Ändern sich diese Regeln, sagen wir es dir in der App, bevor sie gelten. Was mit deinen Daten passiert, steht
        in der Datenschutzerklärung.
      </p>
    </LegalPage>
  );
}

function TermsEn() {
  return (
    <LegalPage title="Terms of use">
      <p>Last updated: {OPERATOR.updated}</p>

      <h2>1. What this is</h2>
      <p>
        Pistl helps you plan ski days with your crew. Pistl is run by {OPERATOR.name}, {OPERATOR.city},{" "}
        {OPERATOR.country}. By creating an account you accept these rules.
      </p>

      <h2>2. Who can join</h2>
      <p>
        You are at least 14 and give your real birth date. It decides what you see and who sees you. One account
        belongs to one person.
      </p>

      <h2>3. Zero tolerance</h2>
      <p>There is no place on Pistl for:</p>
      <ul>
        <li>insults, hate or incitement against people or groups</li>
        <li>harassment, bullying, threats or stalking</li>
        <li>sexual content, nudity or advances towards minors</li>
        <li>violence, calls to self-harm, selling drugs or weapons</li>
        <li>spam, advertising, scams or fake profiles</li>
        <li>other people&apos;s photos or data without their permission</li>
      </ul>
      <p>We remove such content and ban anyone who breaks these rules. We review every report within 24 hours.</p>

      <h2>4. Report and block</h2>
      <p>
        You can report or block anyone from their ride, their post, a chat or your crew. A post you report disappears
        for you at once. A block works both ways and ends every connection. In an emergency call 112. For abuse, write
        to <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
      </p>

      <h2>5. Meeting up and carpools</h2>
      <p>
        Pistl brings people together but does not organise trips or check anyone. You decide who you go with. Tell
        someone where you are going and with whom, and only go if you feel safe.
      </p>

      <h2>6. Your content</h2>
      <p>
        What you post is yours. You let Pistl show it to the people the app&apos;s rules allow. You can delete it at any
        time, and everything else with your account.
      </p>

      <h2>7. Ending</h2>
      <p>
        You can delete your account in your profile at any time. We may suspend or delete an account that breaks these
        rules.
      </p>

      <h2>8. Changes</h2>
      <p>
        If these rules change, we tell you in the app before they apply. What happens to your data is in the privacy
        policy.
      </p>
    </LegalPage>
  );
}
