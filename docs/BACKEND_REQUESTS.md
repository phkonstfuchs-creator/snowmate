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

**Behelf heute:** `features/rides/visibility.ts` bildet die Regel als
getestete Funktion ab und liefert `meetPoint: null`, solange keine
Zusage vorliegt. Das ist Darstellung, keine Durchsetzung — die Fixtures
enthalten weiterhin alle Felder.

Siehe Punkt 5: Bei öffentlichen Events wiegt dieselbe Lücke schwerer,
weil dort auch Fremde lesen.

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

## 5. Öffentliche Events brauchen serverseitige Sichtbarkeit

**Status:** OFFEN — **höchste Priorität von allen Punkten hier**
**Betrifft:** Schema für `rides`, RLS-Regeln, Lese-DTO

Mit dem Screen *Events* (`/events`) gibt es erstmals Inhalte, die
**ohne Freundschaft** sichtbar sind. Damit fällt die bisherige
Schutzannahme weg: Bis jetzt war jede Leserin und jeder Leser
mindestens Freundesfreund. Bei einem öffentlichen Event liest die
ganze Welt mit.

### Gebrauchtes Feld

```
rides.visibility  enum('friends','public')  not null  default 'friends'
```

`default 'friends'` ist Absicht: Wer das Feld vergisst, bekommt die
engere Sichtbarkeit, nicht die weitere.

### Durchzusetzende Regeln

| # | Regel | Warum |
|---|---|---|
| 1 | `meet_point` wird **nicht ausgeliefert**, solange die abfragende Person nicht zugesagt hat | Ein Client-Filter reicht nicht: Der Treffpunkt stünde trotzdem in der API-Antwort und wäre über die Netzwerkkonsole lesbar |
| 2 | Bei `visibility = 'public'` unterbricht auch Freundschaft die Sperre **nicht** — nur die Zusage zählt | Sonst wäre die Zusage bei Events wirkungslos |
| 3 | `visibility = 'public'` ist verboten, wenn die gastgebende Person minderjährig ist | Minderjährige dürfen nicht an Fremde ausspielen. Als **Check Constraint oder Trigger**, nicht nur als Policy |
| 4 | Beitritt wird serverseitig gegen `total_spots` geprüft | Sonst überbucht ein paralleler Request das Event |
| 5 | Ein Event einer minderjährigen Person taucht in der öffentlichen Liste nicht auf, selbst wenn das Flag falsch gesetzt wurde | Zweite Verteidigungslinie, falls Regel 3 umgangen wurde |

### Vorschlag für den Lesevertrag

Zwei getrennte Ansichten statt eines Feldes, das mal gefüllt ist und
mal nicht:

- `rides_public` — ohne `meet_point`, für die Liste
- `rides_joined` — mit `meet_point`, nur für zugesagte Teilnehmende

Damit kann das Feld gar nicht erst versehentlich mitgeliefert werden.

**Warum das der wichtigste Punkt ist:** Alle anderen Lücken hier
betreffen Bequemlichkeit oder Sprache. Diese betrifft den genauen
Aufenthaltsort einer möglicherweise minderjährigen Person gegenüber
Fremden.

**Behelf heute:** `features/rides/visibility.ts` mit
`toVisibleRide`, `canPostPublicRide` und `isDiscoverablePublicRide`,
abgedeckt durch `features/rides/visibility.test.ts`. Die Funktion
entfernt `meetPoint` per Destructuring aus dem Objekt, statt es nur
auszublenden — im Prototyp verlässlich, gegen einen echten Server
wertlos. Zusätzlich ist der Öffentlich-Schalter in
`PostRideModal` für Minderjährige gesperrt, was sich clientseitig
trivial umgehen lässt.

**Nicht verhandelbar:** Bevor echte Nutzerdaten an `/events` hängen,
müssen Regel 1 bis 3 als negative pgTAP-Tests vorliegen.

---

## Erledigt

_(noch nichts)_
