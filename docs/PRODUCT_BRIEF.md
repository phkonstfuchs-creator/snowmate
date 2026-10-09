# Pistl: Founder-Plan für den ersten echten Crew-Launch

Stand: 2026-10-08. Vorschlag, keine Implementierungs- oder Rechtsfreigabe.
Basis: lokaler Arbeitsstand einschließlich vorhandener uncommitteter Änderungen,
Founder-Briefing und zwei getrennte Read-only-Prüfungen. Die Übereinstimmung mit
einer anderen oder veröffentlichten Pistl-Version ist nicht bestätigt. Bestehende
Launch-Gates werden durch dieses Dokument weder aufgehoben noch als erfüllt erklärt.

## Entscheidung

Zuerst einen vollständigen, geschützten Crew-Ablauf produktiv verbinden.
Als differenzierende Funktion einen bedingten Fahrtwunsch bauen:
"Ich würde fahren, wenn …" wird zu einem gemeinsam bestätigten Plan.
Öffentliche Entdeckung, komplexe Standortschätzung und Zahlungsentwicklung erhalten
keinen Vorrang vor dieser nutzbaren Kette.

## Verifizierter lokaler Stand

- `app/(app)/feed/page.tsx:5` lädt Beispieldaten. Zeile 32 setzt 174/127 Personen
  fest; Zeile 112 setzt das Datum fest. Ab Zeile 40 verändert Beitreten lokalen
  Zustand. Zeile 171 reicht einen leeren `onPost`-Callback weiter.
- `features/rides/actions.ts` und `features/rides/data.ts` enthalten echte
  validierte Serveraktionen und RPC-Datenzugriffe. Ihre Existenz bedeutet nicht,
  dass die Feed-Oberfläche sie verwendet oder die Migrationen deployed sind.
- `features/auth/credentials.ts:101` und
  `supabase/migrations/20260803110000_account_safety_and_consent.sql:299`
  verlangen mindestens 16 Jahre. Die Rechtstexte und `docs/compliance/README.md`
  beschreiben ebenfalls eine 16+-Beta für Deutschland und Österreich.
  Das widerspricht dem Founder-Ziel 14+ in Innsbruck/Salzburg.
- Die lokale Zugriffslogik beschränkt minderjährige Personen bereits stärker
  als das ursprüngliche Briefing: `features/access/policy.ts`.
  Daraus folgt keine vollständige Sicherheit aller Schnittstellen.
- Moderationsaktionen, Export/Löschung, Consent und weitere Schutzgrundlagen
  existieren. Bereitstellung, durchgängige UI-Anbindung, besetzte Moderation und
  technische/rechtliche Abnahmen sind hier nicht nachgewiesen.
- `components/feed/PostRideModal.tsx:42` bietet Skigebiete aus regional
  gefilterten Fixtures an, keine einzelnen Liftanlagen. Die Fixtures enthalten
  13 Innsbruck- und sieben Salzburg-Gebiete. Liftzahlen sind statisch.
  Eine individuelle Liftauswahl oder Live-Wartezeitberechnung wurde hier nicht gefunden.

## Für wen und warum

Erste Einheit: eine bestehende Ski-/Snowboard-Crew mit mehreren Personen in
Innsbruck oder Salzburg. Nutzerfrage: "Wer kann mit, was passt uns und wie kommen
wir hin?" Die Häufigkeit und heutige Koordinationsdauer sind noch nicht gemessen.

[Hypothese] Viele Pläne hängen an unausgesprochenen Bedingungen: freie Mitfahrt,
mindestens zwei Freunde, kompatible Zeitfenster oder ein passendes Skigebiet.
Pistl soll diese Bedingungen sichtbar zusammenbringen. Die Nähe zur kommenden
Saison schafft einen Testanlass, ist aber kein Nachweis für Nachfrage.

## Leitfunktion: Pistl Go

Beispiel mit fiktiven Personen: Alex kann morgen ab 10 Uhr, wenn eine Mitfahrt
verfügbar ist. Mia fährt mit mindestens zwei weiteren Freunden. Sam bietet zwei
freie Plätze. Die Crew erhält einen Vorschlag: "Drei Interessierte, passende
Zeiten, zwei angebotene Plätze. Plan bestätigen?"

Die erste Version benötigt manuelle Angaben und einfache Regeln:

1. Tag/Zeitfenster, ein bis wenige Wunschgebiete, Crew und optionale Bedingung
   wählen. Anfangs nur Mindestgruppengröße und Mitfahrbedarf unterstützen.
2. Zustände trennen: interessiert, unter Bedingung interessiert, zugesagt,
   abgesagt. Ein Wunsch ist keine verbindliche Teilnahme.
3. Ein passender Vorschlag wird erklärt. Fahrer und Mitfahrer bestätigen Plätze
   ausdrücklich; gleichzeitige Anfragen dürfen keine Überbuchung erzeugen.
4. Nach Bestätigung entsteht ein gemeinsamer Plan mit Treffpunkt und Status.
5. Änderungen lösen eine erneute Prüfung aus; offene Wünsche laufen ab.

Keine automatische Buchung, keine erfundenen Fahrtmöglichkeiten, kein
öffentlicher Aufenthaltskalender. Minderjährige bleiben in der freigegebenen
Kontaktstruktur. Vorschläge erweitern niemals selbstständig den Empfängerkreis.
Passabdeckung und Verkehrsdaten sind für Version 1 keine Voraussetzungen.

Die ambitionierte spätere Version berücksichtigt freiwillig angegebene Pässe,
Zeitfenster, Sitzplätze und verifizierte Gebiets-/Verkehrsdaten. Sie erklärt
mehrere passende Optionen und überlässt den Abschluss der Crew. Ein LLM ist für
die grundlegende Machbarkeitsprüfung nicht erforderlich.

### Umgesetzter erster Schritt (2026-10-09, lokal)

Pistl Go hängt zunächst an einer bestehenden Ausfahrt mit festem Gebiet und
Zeitpunkt. Teilnehmende speichern eine private Mindestgruppe inklusive eigener
Zusage und optionalen Mitfahrbedarf. Andere offene Interessen zählen nicht als
bestätigte Personen. Eine bestätigte Mitfahrt muss zum Gebiet und lokalen Tag
passen und vor Ausfahrtbeginn starten; Ankunftszeiten werden nicht berechnet.
Sowohl bestätigte Plätze in Fahrtangeboten als auch angenommene Fahrer für eine
eigene Platzsuche zählen. Die Regeln werden beim Laden, beim ausdrücklich
angefragten Beitritt und bei Annahme erneut geprüft. Interesse allein erzeugt
keine Teilnahme. Zurückziehen des Wunsches zieht eine offene Teilnahmeanfrage
ebenfalls zurück; bestätigte Teilnahmen werden separat abgesagt.

Dies ist die erste konkrete Stufe des oben beschriebenen Plans. Freie
Zeitfenster, mehrere Wunschgebiete und automatisch zusammengestellte gemeinsame
Vorschläge sind noch offen. Die Migration ist lokal implementiert und geprüft;
eine Bereitstellung auf der gehosteten Datenbank ist damit nicht bestätigt.

## Erlebnis und nachgelagerte Ideen

- Heute zeigt einen relevanten Plan oder eine konkrete offene Bedingung.
  Beispiel: "Für morgen fehlt noch ein Platz" statt einer fiktiven Aktivitätszahl.
- Während eines gemeinsamen Tages bietet "Wieder treffen" eine statische,
  vereinbarte Treffkarte und "Da / später / andere Runde". Keine präzise
  Ankunftszeit ohne belastbare Daten, keine sicherheitskritische Routenführung.
- Ein privater Crew-Pass sammelt freiwillig bestätigte gemeinsame Erlebnisse.
  Ranglisten/Stempel bleiben, belohnen aber weder Tempo noch Risikofahrten oder
  lückenlose Anwesenheit. Wiederholtes Beitreten/Verlassen erzeugt keine Punkte.
- Eine zeitlich begrenzte Nachricht "Noch eine Runde?" ist ein späterer Test für
  spontane Treffen im vorhandenen Kreis, ohne permanente GPS-Freigabe.

Die ersten beiden Ausbauideen werden erst nach stabiler Planung priorisiert.

## Launch-Umfang

Erhalten: Mindestalter 14 als Ziel, beide Regionen, Swipe, Rangliste, Stempel und
klare mobile Gestaltung. Swipe wird als Auswahl von Plänen gestaltet und nutzt
die jeweils freigegebenen Zielgruppenregeln. Eine Ausweitung gegenüber dem
heutigen Freunde-only-Code für Minderjährige ist ein eigenständiger Reviewpunkt.

Erste reale Kette: Konto → Crew/Einladung → echter Plan → explizite Zusage →
Mitfahrabstimmung → einfache Plan-Kommunikation → Melden/Blockieren → Abschluss.
Kontolöschung und die erforderlichen Datenschutzprozesse gehören dazu.

Zurückstellen, sofern nicht abgenommen: offene öffentliche Events, neue präzise
Liveort-Funktionen, öffentliche Fotofeeds, Lift-Wartezeitoptimierung, Zahlungs-
integration, zusätzliche Statistik- und Premiumfunktionen. Features serverseitig
begrenzen; das bloße Verstecken einer Schaltfläche genügt nicht.

## Arbeitspakete und Zuständigkeit

Die Rollen sind Verantwortlichkeiten, keine Behauptung über vorhandenes Personal.

| Reihenfolge | Verantwortlich | Lieferung | Abnahme |
| --- | --- | --- | --- |
| Sofort | Founder + Produkt | Aktuelle Version, Name, Länder-/Altersumfang festlegen; fünf Crew-Verantwortliche für spätere Tests gewinnen | Ein übereinstimmender Produktumfang; keine externe Einladung vor bestehenden Gates |
| Parallel ab Tag 1 | Founder + Rechtsberatung | 14+-Konzept, Betreiberangaben, Verarbeitungen, Verträge und Vorfallbetrieb anhand des begrenzten Launchumfangs prüfen | Dokumentierte Entscheidungen; bestehende Launch-Blocker erfüllt oder nachvollziehbar neu bewertet |
| Zuerst Technik | Backend/Security | Alters-/Kontaktmatrix, Datenbanktests, Migrationen, serverseitige Grenzen, Retention und Löschung prüfen | Negativtests und beobachteter Betriebsnachweis auf Zielumgebung |
| Danach bzw. parallel auf Testdaten | Produktentwicklung | Feed/Crew/Zusagen an vorhandene Serveraktionen anbinden, fiktive Angaben entfernen | Zwei echte Testkonten sehen denselben dauerhaft gespeicherten Zustand; Reload/Absage/Parallelbeitritt korrekt |
| Nach funktionierendem Grundablauf | Produktentwicklung | Kleinste Go-Version mit Mindestgruppe und Mitfahrbedarf | Bedingungen werden korrekt erklärt; keine Überbuchung; keine ungewollte Freigabe |
| Vor Einladungen | QA + Betrieb | Moderation, Offlinezustände, deutsche/englische Texte, Fehlerfälle, Löschung und Datenschutzprozesse | Protokollierte End-to-End-Abnahme und verantwortete Freigabe |
| Nach Gates | Founder | Fünf eingeladene Crews betreut starten, anschließend eigenständige Wiederholung beobachten | Tatsächliche Verabredungen und dokumentierter Unterstützungsaufwand |

[Planungsannahme] Ein erster Zwei-Wochen-Sprint ist ein Arbeitsziel bei ausreichend
verfügbarer Entwicklung und parallel erreichbarer Rechtsberatung. Er ist keine
Zusage für einen rechtlich oder technisch freigegebenen Launch. Solange Aufwand
der Anbindung, Datenbankabnahme und Rechtsprüfung offen ist, gibt es kein seriöses
festes Veröffentlichungsdatum. Store-Vorbereitung kann parallel laufen;
die native Hülle und ihre Veröffentlichung sind in dieser Prüfung nicht nachgewiesen.

## Lift-Hinweis

Der konkrete, vom Founder beschriebene Liftselektor kann zu einer anderen Version
gehören. Dort zuerst Datenumfang, Gebietszuordnung, Filter, Pagination und
Auswahlzustand prüfen. Das lokale Repository erlaubt keine Behauptung über dessen
konkreten Fehler.

Gezielte Kitzsteinhorn-Nachprüfung am 2026-10-08: Im lokalen Code steht lediglich
der statische Resort-Datensatz mit `liftsOpen: 9` und `totalLifts: 10`
(`lib/data/mock-data.ts:419`); einzelne Anlagen sind nicht modelliert. Die
Betreiberseite https://www.kitzsteinhorn.at/de/service/informationen/betriebs-oeffnungszeiten
zeigt beim Abruf einen Zähler "3 Lifte & Bahnen", führt aber wesentlich mehr
Anlagen namentlich auf, darunter Gletscherjet 1–4, Panoramabahn, Langwiedbahn,
Gipfelbahn und Gletschershuttle. Deshalb ist eine Drei-Anlagen-Anzeige allein noch
kein Beleg für einen unvollständigen Gesamtkatalog: Betriebsfilter und Bestand
müssen getrennt geprüft werden. Die statischen lokalen Zahlen sind kein Live-Status.

Für einen echten Liftkatalog: stabile IDs, Gebiet, Tal-/Bergstation, Typ,
Koordinaten und Datenquelle; Anlagenbestand und Betriebsstatus getrennt halten.
Unbekannter Status darf keinen Lift kommentarlos aus der Auswahl entfernen.
Suche und bewusster manueller Treffpunkt sind sinnvolle Fallbacks.

Live-Andrang braucht eine tatsächliche Quelle. Betreiberfeed, historische
Schätzung und frische Crew-Meldung müssen unterscheidbar sein. Jede Angabe braucht
Zeitstempel und Ablauf; ohne Daten steht "Wartezeit unbekannt". Eine Schätzung aus
Entfernung allein bildet Warteschlange, Liftfahrt und Pistenverbindung nicht ab.
Crowd-Daten sind wegen Kaltstart und Manipulation kein Launch-Fundament.

## Test und Entscheidung

[Vorgeschlagene Kriterien] Fünf Crews testen bei jeweils zwei realen geeigneten
Gelegenheiten. Mindestens drei erstellen zweimal einen bestätigten Plan ohne
individuelle Founder-Erinnerung. Zusätzlich Zeit bis Bestätigung, Zahl nötiger
Rückfragen und Unterstützungsaufwand mit dem bisherigen Messenger-Ablauf vergleichen.
Für Go getrennt erfassen, wie viele bedingte Wünsche zu bestätigten und später
als stattgefunden bestätigten Fahrten werden. Keine Behauptung kausaler Wirkung
ohne passenden Vergleich. Fehlende saisonale Gelegenheit bedeutet unentschieden.

Bei guter Organisation ohne Wiederholung zuerst Go-Nutzen und Zugang prüfen.
Bei ausbleibendem Vorteil den Mechanismus vereinfachen oder ändern, bevor weitere
Features folgen. Kein Score für Product-Market-Fit ohne Nutzungsdaten.

Monetarisierung: Clubgespräche und Preisprüfung parallel; zuerst die geplanten
3 Prozent gegen konkreten Organisationsnutzen testen. Ein separater bezahlter
Pilot braucht die Klärung von Anbieterrolle und Zahlungsfluss. Den kostenlosen
Crew-Launch nicht von vier Erlösquellen abhängig machen.

## Externe Referenzen und Grenzen

- Slopes bietet bereits Trip-Planung und soziale Standortfunktionen:
  https://blog.getslopes.com/slopes-pro-tip-trip-planning/ und
  https://getslopes.com/data . Go ist eine Positionierungshypothese, keine
  behauptete weltweite Neuheit.
- Apple-Anforderungen an UGC und App-Nutzen:
  https://developer.apple.com/app-store/review/guidelines/ . Eine Hülle allein
  garantiert keine Zulassung.
- Österreichische Einwilligungsregel für entsprechende Dienste ab 14:
  https://ris.bka.gv.at/eli/bgbl/i/1999/165/A2P4/NOR40212006 . Das ersetzt keine
  funktionsbezogene Rechts- oder Vertragsprüfung; Betreibersitz bleibt relevant.

Nächste Umsetzungseinheit nach Bestätigung der richtigen Codebasis: bestehenden
Feed an echte Ride-Lese-/Schreibaktionen anbinden und das 14+-Ziel konsistent
spezifizieren. Dieses Briefing selbst ändert weder Produktcode noch Policies.
