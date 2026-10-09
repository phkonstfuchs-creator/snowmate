# Verzeichnis der Verarbeitungstätigkeiten (ROPA/VVT)

**Status:** `DRAFT – NOT LEGALLY APPROVED`\
**Version:** 0.1-template\
**Stand:** 2026-08-03\
**Owner:** `LAUNCH_BLOCKER[COMPLIANCE_OWNER]`\
**Freigabe:** `LAUNCH_BLOCKER[LEGAL_REVIEW_APPROVAL]`

Arbeitsvorlage für das Verzeichnis nach Art. 30 Abs. 1 DSGVO. Vor Launch sind alle Angaben mit Produkt, Datenbank, Provider-Einstellungen und Verträgen abzugleichen.

## 1. Verantwortlicher

- Name/Firma: `LAUNCH_BLOCKER[OPERATOR_LEGAL_NAME]`
- Rechtsform: Einzelunternehmen
- Anschrift: `LAUNCH_BLOCKER[OPERATOR_POSTAL_ADDRESS]`
- Datenschutzkontakt: `LAUNCH_BLOCKER[PRIVACY_CONTACT_EMAIL]`
- Datenschutzbeauftragter: `LAUNCH_BLOCKER[ASSESS_DPO_REQUIREMENT_AND_DOCUMENT_RESULT]`
- Federführende Aufsichtsbehörde: `LAUNCH_BLOCKER[COMPETENT_SUPERVISORY_AUTHORITY]`
- Vertreter: nicht vorgesehen; Betreiber ist in Deutschland niedergelassen. Anwaltlich bestätigen.

## 2. Allgemeiner Rahmen

- Betroffene: eingeladene Interessierte, Mitglieder ab 16 Jahre, 16-/17-jährige Mitglieder, meldende und gemeldete Personen, Supportkontakte.
- Märkte: Deutschland und Österreich.
- Größenordnung: maximal 100 aktive Beta-Mitglieder.
- Keine geplanten besonderen Kategorien nach Art. 9 DSGVO. Freitext kann dennoch ungewollt sensible Angaben enthalten; Datenminimierung, Community-Regeln und Moderation sind erforderlich.
- Keine Werbung, Zahlungen, öffentliche Registrierung oder native iOS-App in dieser Verzeichnisversion.
- Allgemeine Empfänger: Supabase, Vercel, Brevo und optional PostHog EU; Behörden oder Beratende nur bei gesetzlicher Grundlage beziehungsweise Rechtsverfolgung.
- Drittlandbezug: möglich. Details und Garantien stehen in [dpa-tia.md](./dpa-tia.md) und sind `LAUNCH_BLOCKER[PROCESSOR_CONTRACTS_AND_TRANSFERS]`.
- Allgemeine TOM: siehe [toms.md](./toms.md). Keine Maßnahme gilt allein durch Nennung als implementiert.

## VVT-01 Einladung, Konto und Authentifizierung

- **Zwecke:** Zugang auf Closed Beta begrenzen, Konto erstellen, E-Mail bestätigen, anmelden, Sitzung verwalten, Passwort wiederherstellen, Missbrauch verhindern.
- **Betroffene:** eingeladene und registrierte Personen.
- **Daten:** Einladungskennung und Hash, Ziel-E-Mail, Ablauf/Einlösung, E-Mail, Auth-ID, Passwort-Hash beim Auth-Anbieter, Session- und Bestätigungsdaten, angenommene Dokumentversionen mit Zeitstempel sowie IP-/Sicherheitsereignisse.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO für Konto; Art. 6 Abs. 1 lit. f DSGVO für Sicherheit. Interessenabwägung und genaue Trennung: `LAUNCH_BLOCKER[AUTH_LEGAL_BASIS_REVIEW]`.
- **Empfänger:** Supabase (Auth/Datenbank), Vercel (Serverausführung), Brevo (Transaktions-E-Mail).
- **Löschung:** Einladung 30 Tage nach Ablauf/Einlösung; Konto bis Löschung; Sicherheitslogs grundsätzlich 30 Tage, incidentbezogen länger mit dokumentiertem Grund.
- **TOM/Evidenz:** einmalige ablaufende Einladung, E-Mail-Bindung, serverseitige Alters-/Invite-Prüfung, versionierter Vertragsschluss, getrennte optionale Einwilligungen, Rate Limits, sichere Cookies, MFA für Admins, Auth-Audit. `LAUNCH_BLOCKER[INVITE_AUTH_CONTROLS_VERIFIED]` und `LAUNCH_BLOCKER[ACCOUNT_LEGAL_ACCEPTANCE_FLOW]`.

## VVT-02 Altersprüfung und Minderjährigenstatus

- **Zwecke:** Mindestalter 16 durchsetzen, Minderjährigen-Schutzregeln serverseitig anwenden, Wechsel zur Volljährigkeit ableiten.
- **Betroffene:** alle registrierenden und registrierten Personen, insbesondere 16-/17-Jährige.
- **Daten:** Geburtsdatum im privaten Schema, abgeleitete Altersgruppe, `is_minor`, Prüfverfahren und Zeitstempel; keine standardmäßige Ausweiskopie.
- **Arbeitsannahme Rechtsgrundlage:** Vertragserfüllung und berechtigte Schutzinteressen; Art. 8 DSGVO ist bei einwilligungsbasierten Verarbeitungen zu beachten. `LAUNCH_BLOCKER[MINOR_LEGAL_BASIS_AND_CONTRACT_REVIEW]`.
- **Empfänger:** Supabase; intern nur eng begrenzte Betreiberrolle.
- **Löschung:** mit Konto; abgeleiteter Status wird aktualisiert. Kein öffentliches Geburtsdatum.
- **TOM/Evidenz:** privates Schema, keine Data-API-Privilegien, serverseitige Ableitung, Manipulations- und Bypass-Tests. `LAUNCH_BLOCKER[AGE_GATE_VERIFIED]`.

## VVT-03 Profil, Freundschaften, Blocks und Crews

- **Zwecke:** eigenes Profil darstellen, bestätigte Beziehungen und Crews verwalten, sichere Sichtbarkeit steuern.
- **Betroffene:** Mitglieder und ihre bestätigten Beziehungen.
- **Daten:** Anzeigename, Handle, Stadt, Fahrkönnen, Bio, Avatar-Pfad/Status, Freundschaftsanfragen, Freundschaften, Blocks, Crew-Mitgliedschaften und Einladungen.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO; Sicherheits-/Blockdaten ergänzend Art. 6 Abs. 1 lit. f DSGVO. `LAUNCH_BLOCKER[SOCIAL_GRAPH_LEGAL_BASIS_REVIEW]`.
- **Empfänger:** Supabase, Vercel; sichtbare Mitglieder ausschließlich nach RLS-/DTO-Matrix.
- **Löschung:** mit Konto; offene Anfragen nach 30 Tagen; Blocks bis Aufhebung oder Kontolöschung, soweit kein Sicherheits-Legal-Hold besteht.
- **TOM/Evidenz:** Minor nur bestätigte Freunde, Erwachsene Friends-of-Friends nur nach Freigabe, Block überstimmt jede Beziehung, negative RLS-Tests. `LAUNCH_BLOCKER[SOCIAL_GRAPH_RLS_VERIFIED]`.

## VVT-04 Resorts, Rides und Carpools

- **Zwecke:** gemeinsame Bergtage, Teilnahme und Mitfahrplätze koordinieren.
- **Betroffene:** Hosts, anfragende und angenommene Mitglieder.
- **Daten:** Resort, Datum/Zeit, Aktivität, Level, Beschreibung, Kapazität, Teilnahme-/Sitzanfragen, Status, angenommene Mitglieder; sensible Details wie Treffpunkt/Abfahrt getrennt.
- **Pistl Go:** private bedingte Interessen mit Mindestgruppe, Mitfahrbedarf und Rückzugszeitpunkt. Die Statusauswertung ist nur für die jeweilige Person verfügbar; offene Wünsche reservieren keine Plätze. Export und Kontolöschung umfassen diese Daten.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO. Sicherheitsprüfung für Minderjährige: `LAUNCH_BLOCKER[RIDE_MINOR_RULES_REVIEW]`.
- **Empfänger:** Supabase, Vercel und jeweils RLS-berechtigte Mitglieder.
- **Löschung:** operative Ride-Daten nach `LAUNCH_BLOCKER[RIDE_RETENTION_APPROVAL]`; sensible Details spätestens 24 Stunden nach Ride, sofern kein gemeldeter Vorfall besteht.
- **TOM/Evidenz:** transaktionale/idempotente Annahme, Kapazitätsgrenzen, getrennte Feed-/Detail-DTOs, Minor nur bestätigte Freunde. `LAUNCH_BLOCKER[RIDE_RLS_AND_CONCURRENCY_VERIFIED]`.

## VVT-05 Direkt- und Ride-Gruppenchat

- **Zwecke:** Abstimmung zwischen bestätigten Freunden und angenommenen Ride-Teilnehmern.
- **Betroffene:** Chat-Mitglieder.
- **Daten:** Conversation-ID, Mitgliedschaft, Text, Absender, Zeitstempel, Zustell-/Lesestatus; keine Medien in der Closed Beta.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO; Moderation/Sicherheit Art. 6 Abs. 1 lit. f beziehungsweise c DSGVO. Vertraulichkeits- und DSA-Einordnung: `LAUNCH_BLOCKER[CHAT_LEGAL_REVIEW]`.
- **Empfänger:** Supabase Realtime/Datenbank, Vercel, berechtigte Conversation-Mitglieder, Moderator nur bei Meldung oder dokumentiertem Sicherheitsgrund.
- **Löschung:** Ride-Chat 90 Tage nach Ride; DM zwölf Monate nach letzter Aktivität; gemeldete Ausschnitte nach VVT-08.
- **TOM/Evidenz:** private Realtime-Kanäle, keine Fremden-DM, erneute Berechtigungsprüfung nach Block, Rate Limits, Filter, negative RLS-Tests. `LAUNCH_BLOCKER[CHAT_AUTHORIZATION_VERIFIED]`.

## VVT-06 Resort-Präsenz und präzise Live-Position

- **Zwecke:** freiwillige zeitlich begrenzte Koordination am Berg.
- **Betroffene:** Mitglieder, deren berechtigte Freunde und gegebenenfalls angenommene volljährige Ride-Teilnehmer.
- **Daten:** Resort-Präsenz; bei aktiv gestarteter Session letzte Breite/Länge, Genauigkeit, Zeitstempel, Session-Ablauf und Freigabekreis. Keine geplante Bewegungsverlaufstabelle.
- **Arbeitsannahme Rechtsgrundlage:** ausdrückliche Einwilligung oder Erforderlichkeit zur angeforderten Leistung; Entscheidung erst nach Rechtsprüfung. `LAUNCH_BLOCKER[LOCATION_LEGAL_BASIS_AND_DPIA]`.
- **Empfänger:** Supabase, Vercel und RLS-berechtigte Mitglieder; keine Koordinaten an PostHog, Brevo oder Logs.
- **Löschung:** letzter präziser Punkt nach fünf Minuten ohne Heartbeat beziehungsweise sofort bei Stop; Resort-Präsenz nach 24 Stunden; Session standardmäßig vier, maximal acht Stunden.
- **TOM/Evidenz:** Vordergrundbetrieb, bewusster Start, manueller Resort-Fallback, kein Prompt beim App-Start, Block-Revoke, TTL-Job und Löschalarm. `LAUNCH_BLOCKER[LOCATION_IMPLEMENTATION_VERIFIED]`.

## VVT-07 Profilbilder

- **Zwecke:** freiwillige persönliche Darstellung.
- **Betroffene:** Mitglieder und berechtigte Profilbetrachter.
- **Daten:** hochgeladenes Original vorübergehend, neu codierter Avatar, Dateimetadaten, Moderationsstatus.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO. `LAUNCH_BLOCKER[AVATAR_LEGAL_BASIS_REVIEW]`.
- **Empfänger:** Supabase Storage, Vercel/Verarbeitungsdienst `LAUNCH_BLOCKER[IMAGE_PROCESSOR_DECISION]`, berechtigte Mitglieder.
- **Löschung:** Original sofort nach erfolgreicher Verarbeitung; abgeleitete Datei bei Ersatz oder Kontolöschung; Cache-/Backup-Ablauf dokumentieren.
- **TOM/Evidenz:** privater Bucket, MIME/Magic-Byte-/Größenprüfung, Neucodierung, EXIF-Entfernung, feste Dimensionen, Freigabestatus, signierte URLs. `LAUNCH_BLOCKER[AVATAR_PIPELINE_VERIFIED]`.

## VVT-08 Meldungen, Moderation, Blockierung und Einspruch

- **Zwecke:** illegale Inhalte und Regelverstöße bearbeiten, Betroffene schützen, Entscheidungen begründen, Einsprüche prüfen, Rechtsansprüche sichern.
- **Betroffene:** meldende, gemeldete und betroffene Personen, Zeugen.
- **Daten:** Kontakt, Referenz, Fundstelle, Begründung, minimierte Nachweise, Risikoklasse, Maßnahmen, Begründung, Einspruch, Bearbeitende, Audit-Zeitstempel.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. c und f DSGVO; gegebenenfalls Art. 9 Abs. 2 oder Art. 10 DSGVO bei unbeabsichtigt enthaltenen sensiblen/strafrechtlichen Angaben. `LAUNCH_BLOCKER[MODERATION_LEGAL_BASIS_REVIEW]`.
- **Empfänger:** befugte Moderation, Vercel, Supabase; Behörden/Beratende nur nach dokumentierter Rechtsprüfung.
- **Löschung:** Meldungsinhalt/Nachweise 90 Tage nach dem späteren Fall- oder Einspruchsabschluss; Entscheidungsmetadaten zwölf Monate ab diesem Zeitpunkt; dokumentierter Legal Hold als Ausnahme.
- **TOM/Evidenz:** öffentlicher Kanal ohne Konto, Need-to-know-Zugriff, unveränderliches Audit, klare Begründung, kostenlose erneute Prüfung, Missbrauchsschutz. `LAUNCH_BLOCKER[MODERATION_OPERATIONS_READY]`.

## VVT-09 Transaktions-E-Mail

- **Zwecke:** Einladung, E-Mail-Bestätigung, Passwortwiederherstellung, Sicherheits- und angeforderte Serviceinformation.
- **Betroffene:** eingeladene und registrierte Personen.
- **Daten:** E-Mail, Template-/Nachrichtentyp, Zustellstatus, providerseitige technische Metadaten; keine Marketingsegmente.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO, bei Sicherheitswarnungen ergänzend lit. f. `LAUNCH_BLOCKER[EMAIL_LEGAL_BASIS_REVIEW]`.
- **Empfänger:** Brevo und dessen geprüfte Unterauftragsverarbeiter.
- **Löschung:** Zustellmetadaten grundsätzlich 30 Tage; Bounces/Sperrlisten so lange wie zur Unterdrückung fehlerhafter Zustellung erforderlich. Providerkonfiguration bestätigen.
- **TOM/Evidenz:** SPF, DKIM, DMARC, TLS, keine sensiblen Inhalte, keine präzisen Standorte, getrennte Marketingfunktion deaktiviert. `LAUNCH_BLOCKER[BREVO_CONFIGURATION_VERIFIED]`.

## VVT-10 Optionale Produktanalyse

- **Zwecke:** freiwillige Messung von Beta-Nutzung, Fehlern und Funktionsannahme.
- **Betroffene:** ausschließlich einwilligende Mitglieder.
- **Daten:** serverseitig erzeugte zufällige Analyse-ID, freigegebene Ereignisnamen, Zeitpunkt, grobe technische Produktversion; keine Identität, Texte, Beziehungsdaten oder Koordinaten.
- **Arbeitsannahme Rechtsgrundlage:** Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG, soweit Gerätezugriff erfolgt.
- **Empfänger:** PostHog EU erst nach Opt-in.
- **Löschung:** maximal zwölf Monate beziehungsweise früher bei Widerruf/Löschanfrage; tatsächliche PostHog-Einstellung nachweisen.
- **TOM/Evidenz:** SDK vor Opt-in nicht geladen, Autocapture/Replay/Personenprofile aus, Event-Allowlist, kontogebundene ID nur aus Supabase, ID-Rotation bei erneuter Einwilligung, retrybare Providerlöschung bei Widerruf. `LAUNCH_BLOCKER[POSTHOG_CONSENT_VERIFIED]`.

## VVT-11 Support, Betroffenenrechte und Data Breaches

- **Zwecke:** Anfragen beantworten, Rechte erfüllen, Sicherheitsvorfälle untersuchen und Meldepflichten erfüllen.
- **Betroffene:** Anfragende, Kontoinhaber und von Vorfällen betroffene Personen.
- **Daten:** Kontakt, Anfrage, Identitätsprüfung, Bearbeitung, Export/Löschstatus; bei Vorfällen System-, Audit- und Risikodaten.
- **Arbeitsannahme Rechtsgrundlage:** Art. 6 Abs. 1 lit. c DSGVO, ergänzend Art. 6 Abs. 1 lit. f für Verteidigung von Rechtsansprüchen und Sicherheit.
- **Empfänger:** befugte Betreiberrollen, Provider-Support, Beratung und zuständige Behörden nach Bedarf.
- **Löschung:** DSAR-Akte zwölf Monate nach Abschluss; Breach-Akte nach anwaltlich bestätigter Frist `LAUNCH_BLOCKER[INCIDENT_RECORD_RETENTION]`.
- **TOM/Evidenz:** verifizierter Intake, Fristenregister, minimaler Export, verschlüsselte Übergabe, Incident-Runbook, Rollen/Vertretung. Siehe [dsar.md](./dsar.md) und [data-breach.md](./data-breach.md).

## 3. Abschlusscheck

- [ ] Jede aktive Tabelle, Storage-Datei, Realtime-Nachricht, Logquelle und Provider-Datenkategorie ist einem VVT zugeordnet.
- [ ] Zwecke und Rechtsgrundlagen wurden pro Zweck getrennt geprüft; Einwilligung wird nicht pauschal verwendet.
- [ ] Interessenabwägungen liegen für jede Verarbeitung nach Art. 6 Abs. 1 lit. f DSGVO vor.
- [ ] Empfänger und Drittlandangaben entsprechen den unterschriebenen Verträgen und aktuellen Unterauftragsverarbeiterlisten.
- [ ] Löschfristen stimmen mit [retention.md](./retention.md), Provider-Einstellungen und automatisierten Tests überein.
- [ ] TOM-Verweise besitzen prüfbare Evidenz.
- [ ] DPIA und ROPA wurden gemeinsam freigegeben.
- [ ] Freigabedatum, Name der freigebenden Person und nächste Prüfung sind eingetragen.

**Finale Freigabe:** `LAUNCH_BLOCKER[LEGAL_REVIEW_APPROVAL]`
