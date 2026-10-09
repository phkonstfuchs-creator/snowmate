# Runbook für Verletzungen des Schutzes personenbezogener Daten

**Status:** `DRAFT – TABLETOP AND CONTACTS REQUIRED`\
**Stand:** 2026-08-03\
**Incident Lead:** `LAUNCH_BLOCKER[INCIDENT_LEAD]`\
**Stellvertretung:** `LAUNCH_BLOCKER[INCIDENT_DEPUTY]`\
**Rechtskontakt:** `LAUNCH_BLOCKER[BREACH_COUNSEL_CONTACT]`\
**Aufsichtsbehörde:** `LAUNCH_BLOCKER[COMPETENT_SUPERVISORY_AUTHORITY]`

Eine Datenschutzverletzung ist ein Sicherheitsvorfall, der zur unbeabsichtigten oder unrechtmäßigen Vernichtung, zum Verlust, zur Veränderung, zur unbefugten Offenlegung oder zum unbefugten Zugang zu personenbezogenen Daten führt. Jeder Verdacht wird dokumentiert; nicht jeder Sicherheitsfehler ist eine Datenschutzverletzung und nicht jede Datenschutzverletzung ist meldepflichtig.

## Sofortregel

**Keine Person wartet auf vollständige Gewissheit, bevor sie eskaliert.** Sobald mit hinreichender Wahrscheinlichkeit personenbezogene Daten betroffen sind, dokumentiert der Incident Lead den Zeitpunkt der Kenntniserlangung und startet den 72-Stunden-Timer.

## 0–15 Minuten: Eingang und Sicherheit

- [ ] Meldung über `LAUNCH_BLOCKER[SECURITY_REPORTING_CHANNEL]` an Incident Lead und Stellvertretung senden.
- [ ] Ticket mit UTC-/lokalem Zeitstempel, meldender Person, System, erster Beobachtung und sicherem Kontakt anlegen.
- [ ] Bei akuter körperlicher Gefahr oder gefährdeter minderjähriger Person zuerst 112/zuständige Behörden und Moderations-Eskalation einbeziehen.
- [ ] Keine sensiblen Details in normalen Chat, E-Mail-Verteiler oder öffentliche Issue-Tracker kopieren.
- [ ] Beweise schreibgeschützt sichern; keine Logs löschen, Systeme zurücksetzen oder Schlüssel rotieren, bevor notwendige Evidenz erfasst ist, außer dies ist zur unmittelbaren Eindämmung erforderlich.

## 15–60 Minuten: Triage und Eindämmung

- [ ] Betroffene Umgebung und Funktion identifizieren: Auth, RLS, Storage, Chat, Standort, Moderation, Provider oder Admin-Konto.
- [ ] Zugriff sicher eindämmen: Feature-Schalter, betroffene Route/RPC deaktivieren, Sessions widerrufen, Schlüssel gezielt rotieren, Storage privat setzen.
- [ ] Standortleck priorisieren: Standortfunktion stoppen, aktuelle Punkte löschen, Realtime-Kanäle schließen und gefährdete Personen sicher kontaktieren.
- [ ] Minderjährigenfall priorisieren und Beweise nur im Need-to-know-Kreis sichern.
- [ ] Provider-Security-Kontakt eröffnen und vertragliche Frist notieren.
- [ ] Incident Lead, verantwortlichen Betreiber und Rechtskontakt alarmieren.

## 1–4 Stunden: Faktenbasis

Dokumentieren:

- wann der Vorfall begann, entdeckt wurde und mit welcher Sicherheit Pistl Kenntnis hatte;
- Ursache/Angriffsweg und ob er fortbesteht;
- Datenarten, Systeme, betroffene Personen und ungefähre Anzahl von Datensätzen;
- ob Minderjährige, präzise Standorte, Nachrichten, Zugangsdaten oder Meldungsakten betroffen sind;
- wer tatsächlich oder potenziell Zugriff hatte und ob Daten exfiltriert/verändert/gelöscht wurden;
- Eindämmung, Wiederherstellung und noch offene Unsicherheiten;
- Providerinformationen und Zeitpunkte;
- mögliche physische, materielle und immaterielle Folgen.

**Incident-Referenz:** `LAUNCH_BLOCKER[INCIDENT_RECORD_SYSTEM]`

## Risikobewertung

Für jede betroffene Gruppe bewerten:

- Sensitivität und Kombinierbarkeit der Daten;
- leichte Identifizierbarkeit;
- Menge und Dauer des Zugriffs;
- Minderjährigkeit oder andere Schutzbedürftigkeit;
- Vertrauensstellung des Empfängers/Angreifers;
- Wahrscheinlichkeit von Stalking, Doxxing, Grooming, Identitätsmissbrauch, Ruf- oder physischem Schaden;
- Wirksamkeit von Verschlüsselung, Token-Widerruf, TTL und anderen Maßnahmen;
- verbleibendes Risiko nach Eindämmung.

Entscheidungsklassen:

1. **Kein Personenbezug/keine Datenschutzverletzung:** als Security Incident dokumentieren.
2. **Datenschutzverletzung, voraussichtlich kein Risiko:** intern nach Art. 33 Abs. 5 DSGVO dokumentieren; Begründung, warum keine Behördenmeldung.
3. **Voraussichtlich Risiko:** zuständige Aufsicht unverzüglich und möglichst binnen 72 Stunden nach Kenntnis informieren.
4. **Voraussichtlich hohes Risiko:** zusätzlich betroffene Personen ohne unangemessene Verzögerung klar und direkt informieren, sofern keine gesetzliche Ausnahme greift.

**Bewertung/Freigabe:** `LAUNCH_BLOCKER[BREACH_RISK_DECISION_AND_APPROVER]`

## Behördenmeldung

Die federführende deutsche Aufsicht hängt vom Betreibersitz ab und muss vor Launch feststehen. Bei grenzüberschreitender Verarbeitung mit Betroffenen in Österreich wird One-Stop-Shop/Federführung anwaltlich geprüft. Im Zweifel wird mindestens die lokale zuständige Aufsicht kontaktiert.

Mindestinhalt:

- Art der Verletzung;
- Kategorien und ungefähre Zahl betroffener Personen und Datensätze;
- Datenschutz-/Incident-Kontakt;
- wahrscheinliche Folgen;
- ergriffene und vorgeschlagene Maßnahmen einschließlich Schadensminderung;
- Kenntniszeitpunkt, Gründe für eine Verzögerung und Hinweis auf schrittweise Nachmeldung, wenn Informationen fehlen.

- [ ] Erstmeldung vor Ablauf der 72 Stunden absenden, auch wenn sie noch nicht vollständig ist.
- [ ] Fehlende Angaben ohne unangemessene Verzögerung nachreichen.
- [ ] Versand, Empfang und jede Behördenkommunikation in der Incident-Akte sichern.

**Behördenportal/Kontakt:** `LAUNCH_BLOCKER[BREACH_AUTHORITY_CHANNEL]`

## Information betroffener Personen

Bei voraussichtlich hohem Risiko enthält die Nachricht in klarer, einfacher Sprache:

- was passiert ist und wann;
- welche Daten wahrscheinlich betroffen sind;
- wahrscheinliche Folgen ohne Verharmlosung;
- was Pistl getan hat;
- konkrete Selbstschutzschritte, etwa Passwortwechsel, Blockierung oder Hilfe bei Standortgefahr;
- erreichbaren Kontakt und Referenz.

Keine Nachricht enthält fremde Daten, Spekulation als Fakt oder Marketing. Minderjährige erhalten eine altersgerechte Fassung. Bei akuter Standort-/Grooming-Gefahr wird die sichere Kontaktmethode individuell gewählt.

**Vorlage und freigegebener Sender:** `LAUNCH_BLOCKER[BREACH_USER_NOTIFICATION_TEMPLATE]`

## Szenario-Kurzläufe

### Öffentliches Storage-/Avatarobjekt

1. Bucket/Policy sofort privat setzen, signierte URLs widerrufen.
2. Access Logs und Objektliste sichern.
3. Betroffene Inhalte, EXIF-Risiko und Abrufe bewerten.
4. RLS-/Storage-Policy als Regressionstest ergänzen.

### RLS-/IDOR-Leck

1. Betroffene RPC/Route/Realtime-Funktion deaktivieren.
2. Query-/Auditdaten sichern, ohne weitere Daten offenzulegen.
3. Sichtbarkeitsmatrix für minor/block/location besonders prüfen.
4. Patch mit negativem Test und rückwirkende Zugriffsanalyse durchführen.

### Präziser Standort offengelegt

1. Standort und Realtime global oder gezielt stoppen.
2. Aktuelle Punkte löschen und Tokens/Sessions widerrufen.
3. Betroffene sicher und prioritär warnen; bei konkreter Gefahr Notfallweg aktivieren.
4. Keine Standortdetails in Incident-Kanäle duplizieren.

### Admin-/Providerkonto kompromittiert

1. Konto sperren, Sessions/Keys rotieren, MFA/Recovery prüfen.
2. Provider-Auditlogs exportieren und manipulationsgeschützt sichern.
3. Alle durch das Konto erreichbaren Datenkategorien bewerten.
4. Abhängige Secrets und Deployments als kompromittiert behandeln, bis das Gegenteil belegt ist.

### Brevo/PostHog/Vercel/Supabase meldet Vorfall

1. Echtheit über bekannten Providerkanal verifizieren.
2. Zeitpunkt der Pistl-Kenntnis dokumentieren; Provideruhr ersetzt nicht Pistls 72-Stunden-Bewertung.
3. Betroffene Produkte, Regionen, Unterauftragsverarbeiter und Daten abfragen.
4. Eigene Risiko-/Meldeentscheidung treffen und DPA-Rechte nutzen.

## Wiederherstellung

- [ ] Ursache behoben und durch unabhängige zweite Person geprüft.
- [ ] Autorisierung, Datenintegrität, Retention und Monitoring getestet.
- [ ] Wiederanlauf schrittweise; Standort/Chat bleiben aus, bis sichere Funktion belegt ist.
- [ ] Gelöschte/gesperrte Konten werden durch Restore nicht reaktiviert.
- [ ] Betroffene und Behörde erhalten wesentliche Updates.

## Abschluss und Lessons Learned

- [ ] Vollständige Chronologie, Entscheidungen, Evidenz und Kommunikation gesichert.
- [ ] Nichtmeldung nachvollziehbar begründet, falls einschlägig.
- [ ] ROPA, DPIA, TOM, Retention, Tests und öffentliche Information aktualisiert.
- [ ] Root Cause und Maßnahmen haben Owner/Frist; kritische Maßnahmen vor Wiederfreigabe erledigt.
- [ ] Daten der Incident-Akte minimiert und freigegebene Retention gesetzt.
- [ ] Tabletop/Runbook aufgrund der Erkenntnisse angepasst.

**Abschlussfreigabe:** `LAUNCH_BLOCKER[INCIDENT_CLOSURE_APPROVAL]`

## Quellen

- [EDPB Guidelines 9/2022](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en)
- [EDPB: Data breaches for small businesses](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en)
- [Österreichische Datenschutzbehörde: Data-Breach-Verfahren](https://dsb.gv.at/faqs/data-breach-verfahren)

Quellen und Behördenkontakte werden im Tabletop unmittelbar vor Launch verifiziert.
