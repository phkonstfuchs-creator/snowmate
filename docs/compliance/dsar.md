# Verfahren für Betroffenenrechte (DSAR)

**Status:** `DRAFT – OPERATIONAL TEST REQUIRED`\
**Stand:** 2026-08-03\
**Owner:** `LAUNCH_BLOCKER[DSAR_OWNER]`\
**Öffentlicher Kontakt:** `LAUNCH_BLOCKER[PRIVACY_CONTACT_EMAIL]`

Dieses Runbook deckt Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Widerruf ab. Es ersetzt keine Einzelfallprüfung. Gesetzliche Fristen beginnen mit Eingang der Anfrage, nicht erst mit interner Ticketanlage.

## 1. Intake

Akzeptierte Wege:

- authentifizierte Einstellungen für Export, Berichtigung, Consent-Widerruf und Kontolöschung;
- E-Mail an `LAUNCH_BLOCKER[PRIVACY_CONTACT_EMAIL]`;
- jeder andere erkennbare Kontaktweg wird intern an den DSAR Owner weitergegeben.

Bei Eingang:

- [ ] Zeitstempel, Kanal, angefragtes Recht, Sprache (DE/EN) und Frist in einem zugriffsbeschränkten Register erfassen.
- [ ] Referenz ohne unnötige Profildaten vergeben.
- [ ] Eingang unverzüglich bestätigen und erwartete nächste Schritte nennen.
- [ ] Keine Begründung für die Ausübung eines Rechts verlangen.
- [ ] Anfrage eines Minderjährigen in klarer, einfacher Sprache bearbeiten.

## 2. Identitätsprüfung

Die Prüfung muss angemessen und datensparsam sein:

1. Bevorzugt über eine frische authentifizierte Sitzung plus erneute Passwort-/E-Mail-Bestätigung.
2. Bei E-Mail-Anfrage über einen einmaligen Link an die bestätigte Konto-E-Mail.
3. Nur bei begründetem Zweifel zusätzliche konto-nahe Angaben abfragen.
4. Ausweiskopie nicht standardmäßig verlangen. Falls sie ausnahmsweise unvermeidbar erscheint: vorher Datenschutzberatung, Schwärzung nicht benötigter Felder, sicherer Kanal und sofortige Löschung nach Prüfung.
5. Keine Daten herausgeben, solange Identität oder Vertretungsmacht vernünftigerweise ungeklärt ist; die Person transparent über die benötigten Angaben informieren.

**Vertretung/Sorgeberechtigte:** `LAUNCH_BLOCKER[MINOR_REPRESENTATION_PROCESS_LEGAL_REVIEW]`

## 3. Fristensteuerung

- Regelantwort unverzüglich, spätestens innerhalb eines Monats nach Eingang.
- Bei Komplexität oder mehreren Anfragen kann die Frist unter den gesetzlichen Voraussetzungen um bis zu zwei weitere Monate verlängert werden; Begründung und Verlängerung werden innerhalb des ersten Monats mitgeteilt.
- Ablehnung oder Entgelt nur unter den engen gesetzlichen Voraussetzungen für offenkundig unbegründete/exzessive Anfragen und nach Rechtsfreigabe.
- Interne Ziele: Triage 2 Werktage, Identität 5 Werktage, Datenzusammenstellung 15 Kalendertage, Review 20 Kalendertage, Versand spätestens Tag 28.
- Abwesenheit des Owners stoppt keine Frist; Stellvertretung: `LAUNCH_BLOCKER[DSAR_DEPUTY]`.

## 4. Datenquellen-Checkliste

Für jede Anfrage anhand der aktuellen ROPA prüfen:

- [ ] Supabase Auth: Konto, E-Mail, Auth-/Session-/Sicherheitsmetadaten.
- [ ] Private Altersdaten: Geburtsdatum, Altersband, Minderjährigenstatus und Nachweisart.
- [ ] Profil, Avatarreferenz und Storage-Objekte.
- [ ] Einladungen und Annahmen rechtlicher Dokumente/Consent.
- [ ] Freundschaften, Anfragen, Blocks, Crews und Einladungen.
- [ ] Resorts, Rides, Carpools, Teilnehmer, Treffpunkte und Anfragen.
- [ ] Direkt- und Ride-Nachrichten sowie Conversation-Mitgliedschaften.
- [ ] Resort-Präsenz und aktuelle/abgelaufene Standort-Session-Daten, soweit noch vorhanden.
- [ ] Meldungen, Moderationsentscheidungen und Einsprüche, mit Schutz von Daten Dritter.
- [ ] Brevo-Zustellmetadaten.
- [ ] PostHog-Daten anhand pseudonymer Analyse-ID, sofern eingewilligt.
- [ ] Vercel-/Supabase-Sicherheitslogs und Supportkommunikation, soweit personenbezogen und rechtlich herauszugeben.
- [ ] Backups nur hinsichtlich Nachlauf/Löschkonzept; keine riskante Vollwiederherstellung allein für einen Standard-DSAR.

## 5. Auskunft und Export

Exportformat: maschinenlesbares JSON plus verständliche HTML/PDF-Zusammenfassung nur, wenn dafür ein sicherer Generator vorhanden ist. ZIP-Datei verschlüsseln; Kennwort über getrennten Kanal oder zeitlich begrenzten authentifizierten Download bereitstellen.

Der Export enthält:

- Zwecke, Kategorien, Empfänger/Empfängerkategorien, Speicherdauer/Kriterien, Herkunft und Rechte;
- Daten der anfragenden Person in verständlichen Feldnamen und Zeitangaben;
- Informationen zu automatisierten Entscheidungen, falls zukünftig relevant.

Vor Versand:

- [ ] Daten Dritter, interne Sicherheitsgeheimnisse und Rechte anderer abgrenzen; keine pauschale Schwärzung ohne Begründung.
- [ ] Keine Passwort-Hashes, Tokens, Invite-Secrets, signierten URLs oder internen Schlüssel ausgeben.
- [ ] Chat-/Meldedaten sorgfältig auf kollidierende Rechte prüfen.
- [ ] Vier-Augen-Review von Empfänger, Umfang und Downloadberechtigung durchführen.
- [ ] Download nach spätestens sieben Tagen deaktivieren und Exportdatei löschen.

## 6. Berichtigung und Einschränkung

- [ ] Korrekturfähige Profildaten ohne unnötige Verzögerung ändern.
- [ ] Serverabgeleitete Felder wie Minderjährigenstatus nicht direkt durch Clientwert überschreiben; zugrunde liegende Daten sicher prüfen.
- [ ] Empfänger über Berichtigung informieren, soweit gesetzlich erforderlich und möglich.
- [ ] Bei Einschränkung Daten markieren, normale Verarbeitung stoppen und nur erlaubte Ausnahmen zulassen.
- [ ] Person vor Aufhebung einer Einschränkung informieren.

## 7. Löschung

Das technische Verfahren folgt [retention.md](./retention.md).

- [ ] Konto sofort deaktivieren, Sessions widerrufen und Standort stoppen.
- [ ] Primärdaten, Storage und zuordenbare Providerdaten in die Löschqueue aufnehmen.
- [ ] Daten Dritter nicht unkontrolliert löschen; gemeinsame Conversations/Rides gemäß freigegebenem Modell anonymisieren oder entfernen.
- [ ] Meldungs-/Incident-Daten nur mit konkretem, dokumentiertem Rechtsgrund zurückhalten.
- [ ] Backuplaufzeit und verbleibende gesetzliche Einschränkungen verständlich mitteilen.
- [ ] Pistl-Auth-Konto und relationale Primärdaten binnen Ziel 24 Stunden, spätestens sieben Tagen löschen. Offene Providerlöschungen werden separat eskaliert, weiter versucht und bis zur Bestätigung nicht als vollständig abgeschlossen kommuniziert.

## 8. Widerspruch und Consent-Widerruf

- [ ] Jede Verarbeitung nach Art. 6 Abs. 1 lit. f DSGVO identifizieren und Widerspruch anhand der konkreten Gründe prüfen.
- [ ] PostHog-Opt-in sofort für die Zukunft beenden, SDK deaktivieren, lokale Analyse-ID zurücksetzen und Providerlöschung auslösen.
- [ ] Standort-Stop beendet aktuelle Verarbeitung sofort; bestehende gesetzlich zulässige Nachweise werden getrennt beurteilt.
- [ ] Widerruf darf keine Nachteile für Kernfunktionen haben, die ohne die Einwilligung bereitgestellt werden können.

## 9. Entscheidung und Kommunikation

Jede Abschlussantwort enthält:

- bearbeitetes Recht und Umfang;
- getroffene Maßnahmen und Datum;
- bei Teilablehnung konkrete Rechtsgrundlage und nachvollziehbare Begründung;
- Beschwerdemöglichkeit bei der zuständigen Aufsicht und gerichtlicher Rechtsbehelf;
- Kontakt für Rückfragen.

Keine Antwort behauptet Rechtskonformität oder vollständige Löschung, solange Provider-/Backup-Schritte offen sind.

## 10. Abschluss und Audit

- [ ] Identität und Empfängeradresse abschließend geprüft.
- [ ] Alle ROPA-Quellen abgefragt und Providerantworten dokumentiert.
- [ ] Vier-Augen-Prüfung abgeschlossen.
- [ ] Antwort innerhalb der Frist sicher zugestellt.
- [ ] Temporäre Exporte, Abfragen und lokale Dateien gelöscht.
- [ ] DSAR-Akte auf notwendige Metadaten reduziert und Retention gesetzt.
- [ ] Wiederkehrende Ursache als Produkt-/Datenproblem erfasst, ohne Anfragedaten in allgemeine Tickets zu kopieren.

## Launch-Abnahme

- [ ] Test-Auskunft Erwachsener.
- [ ] Test-Auskunft 16-/17-Jährige mit Daten Dritter im Chat.
- [ ] Test-Berichtigung eines serverabgeleiteten Altersstatus.
- [ ] Test-Consent-Widerruf PostHog vor und nach Events.
- [ ] Test-Kontolöschung mit Avatar, Friendship, Ride, Chat, Report und Standort.
- [ ] Test-Providerfehler/Retry und überfällige Anfrage.
- [ ] Öffentliche Datenschutzseite und App-Kontakt verweisen auf den getesteten Kanal.

**DSAR Owner:** `LAUNCH_BLOCKER[DSAR_OWNER_SIGNOFF]`\
**Rechtsprüfung:** `LAUNCH_BLOCKER[DSAR_LEGAL_APPROVAL]`\
**Testprotokoll:** `LAUNCH_BLOCKER[DSAR_TABLETOP_EVIDENCE]`
