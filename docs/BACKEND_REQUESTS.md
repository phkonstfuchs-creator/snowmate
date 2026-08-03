# Backend-Anforderungen aus der Frontend-Arbeit

Gepflegt vom Frontend-Strang (`claude/frontend-beta`). Hier landet
alles, was das Frontend braucht, aber **nicht selbst ändern darf**:
Dateien unter `supabase/`, Auth-Logik, RLS sowie bestehende
DTO-/Server-Action-Verträge.

Konvention: Jeder Eintrag nennt **Bedarf**, **warum**, und den
**heutigen Behelf** im Frontend. Erledigtes wandert nach *Erledigt*
statt gelöscht zu werden, damit die Historie nachvollziehbar bleibt.

Status: `OFFEN` · `IN ARBEIT` · `ERLEDIGT`

---

## 1. Serverseitige Auth-Meldungen sind englisch

**Status:** OFFEN
**Betrifft:** `features/auth/actions.ts`, `features/auth/credentials.ts`

Die Oberfläche ist auf Deutsch, die vom Server zurückgegebenen
Meldungen nicht. Sichtbar u. a.:

| Heute (englisch) | Vorschlag (deutsch) |
|---|---|
| `Check the highlighted fields.` | `Bitte die markierten Felder prüfen.` |
| `Email or password is incorrect.` | `E-Mail oder Passwort stimmt nicht.` |
| `Sign in is temporarily unavailable. Try again shortly.` | `Anmeldung gerade nicht möglich. Bitte kurz später erneut versuchen.` |
| `We could not create the account. Check the details and try again.` | `Account konnte nicht erstellt werden. Bitte Angaben prüfen.` |
| `Sign up is temporarily unavailable. Try again shortly.` | `Registrierung gerade nicht möglich. Bitte kurz später erneut versuchen.` |
| `If this address can be used, you'll receive a confirmation email shortly.` | `Falls die Adresse nutzbar ist, kommt gleich eine Bestätigungsmail.` |
| `Enter a valid email address.` | `Bitte eine gültige E-Mail-Adresse eingeben.` |
| `Use at least 12 characters.` | `Mindestens 12 Zeichen verwenden.` |
| `Add a lowercase letter.` / `Add an uppercase letter.` / `Add a number.` | `Kleinbuchstabe ergänzen.` / `Großbuchstabe ergänzen.` / `Zahl ergänzen.` |
| `Passwords do not match.` | `Passwörter stimmen nicht überein.` |
| `Password is too long.` / `Email address is too long.` | `Passwort ist zu lang.` / `E-Mail-Adresse ist zu lang.` |
| `Enter your password.` | `Bitte Passwort eingeben.` |

**Warum:** Einziger verbliebener Sprachbruch im Produkt. Nutzer sehen
die englischen Texte genau im Fehlerfall — also dann, wenn Klarheit am
wichtigsten ist.

**Behelf heute:** keiner. Das Frontend reicht `state.message`
unverändert durch.

**Hinweis:** Rein textuelle Änderung, die Signaturen von
`AuthActionState` und `CredentialFieldErrors` bleiben gleich. Wenn ihr
später mehrsprachig wollt, wäre statt fertiger Texte ein
Fehler-Code je Fall (`invalid_credentials`, `email_taken`, …) der
tragfähigere Vertrag — dann übersetzt das Frontend.

---

## 2. Feed, Karte, Mitfahrt und Crew laufen auf Beispieldaten

**Status:** OFFEN
**Betrifft:** neue Tabellen + Lesezugriffe; heute `lib/data/mock-data.ts`

Nur Anmeldung, Registrierung und Abmeldung sprechen wirklich mit
Supabase. Alle inhaltlichen Screens rendern statische Fixtures.
Gebraucht werden Lesezugriffe für:

- **Ausfahrten** (`RidePost`): Gebiet, Treffzeit, Treffpunkt, Fahrstil,
  Plätze gesamt/belegt, Text, Autor, Region
- **Teilnahme** an einer Ausfahrt (beitreten / verlassen)
- **Gebietsstatus** (`ResortStatus`): Fahrende jetzt, Schneehöhe,
  offene Lifte, Höhenmeter, Schneelage
- **Mitfahrten** (`CarpoolPost`): Fahrer oder Suchender, Start, Ziel,
  Uhrzeit, freie Plätze
- **Crew**: Freundesliste, offene Anfragen, Annehmen/Ablehnen
- **Konversationen** und Nachrichten
- **Profilzahlen**: XP, Stufe, Tage, Gebiete, Serie, Abzeichen,
  Saisonwertung je Region

**Warum:** Ohne echte Daten ist die App nur vorführbar, nicht nutzbar.

**Behelf heute:** `lib/data/mock-data.ts`. Die Formen in
`lib/types.ts` sind bereits sauber definiert und können als Vorlage
für das Schema dienen.

**Bitte:** Feldnamen möglichst wie in `lib/types.ts` halten, sonst
brauchen wir überall eine Übersetzungsschicht.

---

## 3. Sichtbarkeitsregel ist nur Text, keine Durchsetzung

**Status:** OFFEN
**Betrifft:** RLS-Regeln

Der Crew-Screen verspricht: *„Freunde von Freunden sehen Ausfahrten auf
Gebietsebene. Der genaue Treffpunkt wird erst nach der Zusage
sichtbar."* Das ist heute reine Behauptung im UI.

**Warum:** Standortdaten von Minderjährigen. Die Zusage muss serverseitig
durchgesetzt werden, nicht im Client gefiltert — sonst steht der genaue
Treffpunkt trotzdem in der API-Antwort.

**Behelf heute:** keiner, die Fixtures enthalten immer alle Felder.

---

## 4. Kein Zugriff auf Profildaten des angemeldeten Kontos

**Status:** OFFEN

Das Onboarding sammelt Region, Fahrstil, Anzeigename und Handle und legt
sie in `localStorage` unter `sm_onboarding_draft` ab. Nach der
Registrierung wird der Entwurf **nirgends ausgelesen** — die Angaben
gehen verloren.

**Warum:** Der Nutzer gibt Daten ein, die spurlos verschwinden. Aus
seiner Sicht ein Fehler.

**Behelf heute:** `localStorage`-Eintrag bleibt liegen.

**Gebraucht:** Eine Profiltabelle plus Server-Action, um den Entwurf
nach bestätigter Anmeldung zu übernehmen.

---

## Erledigt

_(noch nichts)_
