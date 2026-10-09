# Datenschutz-Folgenabschätzung (DPIA/DSFA)

**Status:** `DRAFT – LAUNCH GATE, NOT APPROVED`\
**Version:** 0.1-template\
**Stand:** 2026-08-03\
**Verantwortlicher:** `LAUNCH_BLOCKER[OPERATOR_LEGAL_NAME]`\
**DPIA Lead:** `LAUNCH_BLOCKER[DPIA_OWNER]`\
**Formale Freigabe:** `LAUNCH_BLOCKER[LOCATION_LEGAL_BASIS_AND_DPIA]`

Pistl behandelt diese DPIA für die Closed Beta als verpflichtendes Launch-Gate. Ausschlaggebend sind die Kombination aus 16-/17-jährigen Betroffenen, Social Graph, Kommunikationsinhalten und präzisen, zeitnahen Standortdaten. Diese Arbeitsannahme ist konservativ; sie ersetzt nicht die abschließende Bewertung nach Art. 35 DSGVO.

## 1. Freigabestatus

- [ ] Umfang und Datenfluss entsprechen der tatsächlich deployten Beta.
- [ ] ROPA, TOM, Retention, DPA/TIA und öffentliche Datenschutzerklärung sind konsistent.
- [ ] Betroffenen-/Jugendperspektive wurde in verständlicher Form einbezogen.
- [ ] Datenschutzberatung hat Notwendigkeit, Rechtsgrundlagen und Risiken geprüft.
- [ ] Alle hohen Rest-Risiken sind reduziert oder vorab mit der zuständigen Aufsicht konsultiert.
- [ ] Verantwortlicher hat die DPIA mit Datum und Dokumenthash freigegeben.

## 2. Beschreibung der geplanten Verarbeitung

### Zweck

Eingeladene Mitglieder koordinieren Ski-/Snowboardtage, Rides und Carpools mit bestätigten Freunden und bei volljährigen Personen optional im engen Friends-of-Friends-Kreis. Präzise Live-Position dient ausschließlich einer bewusst gestarteten, kurzzeitigen Koordination am Berg.

### Umfang

- Höchstens 100 Beta-Mitglieder in Deutschland und Österreich, Mindestalter 16.
- E-Mail-Konto, privates Geburtsdatum/Altersband, Profil, Social Graph, Rides/Carpools, Textchat, Meldungen und optional Avatar.
- Resort-Präsenz bis 24 Stunden; jeweils letzter präziser Standortpunkt bis fünf Minuten ohne Heartbeat.
- PWA-Vordergrundstandort; kein nativer Hintergrundstandort in dieser DPIA-Version.
- Optionale, einwilligungsbasierte Produktanalyse ohne Identität, Freitext, Social Graph oder Koordinaten.

### Datenfluss

1. Browser sendet notwendige Auth-/Produktdaten über TLS an Vercel/Supabase.
2. Supabase Auth identifiziert die Session; RLS/RPC bestimmen Zugriff aus Freundschaft, Alter, Block und Ride-Status.
3. Präzise Position wird nach bewusster Aktion als einzelner aktueller Datensatz gespeichert und über private Realtime-Kanäle nur Berechtigten zugestellt.
4. Brevo erhält nur für Transaktions-E-Mail erforderliche Kontaktdaten.
5. PostHog EU wird erst nach Opt-in geladen und erhält nur allowlist-basierte pseudonyme Ereignisse.
6. Meldungen werden getrennt von normalen Inhalten, rollenbeschränkt und revisionsfähig bearbeitet.

**Datenflussdiagramm/Architekturbeleg:** `LAUNCH_BLOCKER[DPIA_DATA_FLOW_DIAGRAM]`

## 3. Notwendigkeit und Verhältnismäßigkeit

### Prüffragen

- [ ] Für jede Datenkategorie ist dokumentiert, welche konkrete Funktion ohne sie nicht möglich wäre.
- [ ] Friends-of-Friends ist bei Erwachsenen standardmäßig aus und zeigt niemals präzise Position oder Treffpunkt.
- [ ] Minderjährige sind aus Friends-of-Friends vollständig ausgeschlossen.
- [ ] Standortfreigabe ist optional; manuelle Resort-Auswahl erfüllt die Kernkoordination ohne GPS.
- [ ] Nur der letzte Standortpunkt wird gespeichert; Verlauf, Fitnessmessung und Profiling sind technisch ausgeschlossen.
- [ ] Sessiondauer und Empfängerkreis sind vor Start verständlich; Stop ist jederzeit erreichbar.
- [ ] Geburtstdatum ist privat; ein weniger eingriffsintensives Age-Band allein wurde geprüft und die Entscheidung dokumentiert.
- [ ] Keine Ausweiskopie ohne konkreten Missbrauchsfall und gesonderte Rechts-/Risikoprüfung.
- [ ] Freitextfelder haben Limits, klare Zwecke und Hinweise gegen sensible Daten.
- [ ] Analytics bleibt deaktiviert, wenn keine Einwilligung vorliegt; Ablehnung beeinträchtigt Kernfunktionen nicht.
- [ ] Export, Korrektur, Widerruf, Block und Löschung sind in der App erreichbar und getestet.

**Ergebnis der Erforderlichkeitsprüfung:** `LAUNCH_BLOCKER[DPIA_NECESSITY_ASSESSMENT]`

## 4. Betroffene und mögliche Folgen

Besonders zu berücksichtigen:

- 16- und 17-Jährige als schutzbedürftige Betroffene.
- Personen, deren Aufenthaltsort Rückschlüsse auf Routinen, Wohnort, Schule/Arbeit oder unbeaufsichtigte Situationen zulässt.
- Meldende Personen und Betroffene von Belästigung, Stalking, Doxxing oder Grooming.
- Personen in Berg-/Notfallsituationen, bei denen falsche oder verspätete Informationen physische Folgen haben können.

Mögliche Schäden sind Kontrollverlust, unerwünschte Kontaktaufnahme, Nachstellung, physische Gefährdung, Rufschaden, Diskriminierung, psychische Belastung, Ausschluss aus sozialen Gruppen und unberechtigte Kontosperre.

## 5. Risikoregister

Skala vor Maßnahmen: Eintritt `1 niedrig` bis `4 sehr hoch`, Schwere `1 gering` bis `4 existenziell`; Score = Eintritt × Schwere. Rest-Risiken dürfen erst nach Tests bewertet werden.

| ID | Risiko/Szenario | Betroffene | Initial | Vorgesehene Maßnahmen | Rest-Risiko/Evidenz |
| --- | --- | --- | ---: | --- | --- |
| R-01 | Fremde oder Friends-of-Friends erhalten präzise Position | alle, besonders Minderjährige | 4×4=16 | getrennte DTOs, RLS, private Realtime-Kanäle, Minor-Friends-only, negative Tests | `LAUNCH_BLOCKER[R01_RESIDUAL]` |
| R-02 | Berechtigter Kontakt nutzt Standort für Stalking/Doxxing | Standortteilende | 3×4=12 | bewusster Start, Empfängerkreis, kurzer TTL, Block-Revoke, kein Verlauf, Meldung/Eskalation | `LAUNCH_BLOCKER[R02_RESIDUAL]` |
| R-03 | Minderjährige werden durch Fremde gefunden oder gegroomt | 16-/17-Jährige | 3×4=12 | kein FoF, keine Fremden-DM, gezielte Einladung, Filter, Block, priorisierte Moderation | `LAUNCH_BLOCKER[R03_RESIDUAL]` |
| R-04 | Kontoübernahme offenbart Social Graph, Chat oder Standort | alle | 3×4=12 | sichere Auth, Rate Limits, Session-Revoke, Admin-MFA, Anomaliealarm | `LAUNCH_BLOCKER[R04_RESIDUAL]` |
| R-05 | Standort-TTL/Löschung fällt still aus | Standortteilende | 3×4=12 | serverseitiger Job, Constraints, Alert, Retry, tägliche Stichprobe | `LAUNCH_BLOCKER[R05_RESIDUAL]` |
| R-06 | Blockierte Person behält Realtime- oder Ride-Zugriff | blockierende Person | 3×4=12 | Block hat Vorrang, Channel-Revoke, erneute Autorisierung, E2E-Test | `LAUNCH_BLOCKER[R06_RESIDUAL]` |
| R-07 | Chat enthält Bedrohung, Doxxing oder sensible Daten | Chat-Mitglieder/Dritte | 3×4=12 | friend-/ride-bound Chat, Limits, Filter, Report, Human Review, Retention | `LAUNCH_BLOCKER[R07_RESIDUAL]` |
| R-08 | Falsche Meldung führt zu unfairer Sperre | gemeldete Person | 3×3=9 | Beweise/Kontext, keine reine Zählentscheidung, Begründung, kostenloser Einspruch | `LAUNCH_BLOCKER[R08_RESIDUAL]` |
| R-09 | Meldungsakte offenbart hochsensible Inhalte | meldende/gemeldete Person | 3×4=12 | getrennte Speicherung, Need-to-know, minimierte Nachweise, Audit, 90-Tage-Löschung | `LAUNCH_BLOCKER[R09_RESIDUAL]` |
| R-10 | Avatar enthält EXIF, Schadcode oder fremde Person | Mitglieder/Dritte | 3×3=9 | privater Upload, Magic Bytes, Neucodierung, EXIF-Strip, Freigabe, signed URL | `LAUNCH_BLOCKER[R10_RESIDUAL]` |
| R-11 | Analytics erfasst Identität, Text oder Koordinaten | einwilligende Mitglieder | 3×4=12 | SDK-Gate, Event-Allowlist, Schema-Test, Replay/Autocapture aus, Network Test | `LAUNCH_BLOCKER[R11_RESIDUAL]` |
| R-12 | Drittlandzugriff ohne ausreichende Garantien | alle | 3×4=12 | DPA/SCC, TIA, Datenminimierung, Verschlüsselung, Anbieter-/Subprocessor-Review | `LAUNCH_BLOCKER[R12_RESIDUAL]` |
| R-13 | Löschung/DSAR ist unvollständig oder offenbart Dritte | anfragende/Dritte | 3×4=12 | Dateninventar, Exportfilter, Providerlöschung, Retry/Alert, Vier-Augen-Stichprobe | `LAUNCH_BLOCKER[R13_RESIDUAL]` |
| R-14 | Falsche Ride-/Carpool-Angabe führt zu physischem Risiko | Teilnehmer | 3×4=12 | kein Sicherheitsversprechen, klare Bergregeln, transaktionale Plätze, Meldeweg, Notrufhinweis | `LAUNCH_BLOCKER[R14_RESIDUAL]` |
| R-15 | Betreiber-/Supportkonto hat zu weitreichenden Zugriff | alle | 3×4=12 | Least Privilege, MFA, JIT/zeitlich begrenzt, Audit, regelmäßiger Review | `LAUNCH_BLOCKER[R15_RESIDUAL]` |

## 6. Zusätzliche Schutzmaßnahmen für Minderjährige

- [ ] Datenschutz, Regeln, Standortdialog und Meldestelle wurden mit 16-/17-Jährigen oder geeigneter Jugendexpertise auf Verständlichkeit geprüft.
- [ ] Alter wird nicht als öffentliches Geburtsdatum dargestellt.
- [ ] Minor-Modus kann nicht clientseitig ausgeschaltet werden.
- [ ] Moderation erkennt und priorisiert Grooming, sexuelle Ausbeutung, Doxxing und Erpressung.
- [ ] Keine verhaltensbasierte Werbung, kein Dark Pattern und keine Belohnung für zusätzliche Standortfreigabe.
- [ ] Support fordert keine intimen Nachweise oder Ausweisdokumente über unsichere Kanäle.
- [ ] Übergang zur Volljährigkeit verändert Sichtbarkeit nicht rückwirkend ohne verständliche Information und aktive Wahl.

**Jugendschutz-/UX-Evidenz:** `LAUNCH_BLOCKER[MINOR_SAFETY_REVIEW_EVIDENCE]`

## 7. Validierung der Maßnahmen

- [ ] pgTAP-RLS-Matrix für alle Beziehungs-/Alters-/Blockrollen bestanden.
- [ ] E2E: Start/Stop/TTL, Background/Tab-Wechsel, Block-Revoke und manuelle Resort-Auswahl bestanden.
- [ ] Netzwerktest bestätigt: keine Koordinaten in URL, Logs, PostHog, Brevo oder Fehlertelemetrie.
- [ ] Red-Team-/Abuse-Test für Invite-Bypass, falsches Alter, Account Takeover, IDOR und Realtime-Rejoin bestanden.
- [ ] DSAR-, Lösch-, Moderations- und Breach-Tabletop mit Minderjährigenfall abgeschlossen.
- [ ] Restore und Providerlöschung stichprobenartig bestätigt.
- [ ] Offene Findings nach Schwere und Frist dokumentiert; keine kritischen/hohen Findings vor Beta.

## 8. Konsultation und Entscheidung

- Feedback betroffener/vertretender Personen: `LAUNCH_BLOCKER[DPIA_DATA_SUBJECT_INPUT]`
- Datenschutzberatung: `LAUNCH_BLOCKER[DPIA_COUNSEL_REVIEW]`
- Technische Prüfung: `LAUNCH_BLOCKER[DPIA_TECHNICAL_REVIEW]`
- Verbleibende hohe Risiken: `LAUNCH_BLOCKER[DPIA_HIGH_RESIDUAL_RISK_DECISION]`
- Erforderlichkeit vorheriger Behördenkonsultation nach Art. 36 DSGVO: `LAUNCH_BLOCKER[ARTICLE_36_DECISION]`
- Entscheidung: `LAUNCH_BLOCKER[APPROVE_REJECT_OR_REWORK]`
- Freigabedatum/Dokumenthash: `LAUNCH_BLOCKER[DPIA_SIGNOFF_RECORD]`
- Nächste Prüfung: spätestens sechs Monate nach Freigabe oder sofort bei neuer Datenart, größerem Publikum, nativer Hintergrundortung, Werbung, Zahlung oder geändertem Anbieter.

## Quellen

- [Art. 35 DSGVO](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=de)
- [EDPB: Data Protection Impact Assessment](https://www.edpb.europa.eu/topics/accountability-and-compliance-tools/data-protection-impact-assessment_en)
- [EDPB: Datenschutz durch Technikgestaltung und datenschutzfreundliche Voreinstellungen](https://www.edpb.europa.eu/topics/ai-and-technology/privacy-by-design-and-by-default_en)
- [EDPB: Statement 1/2025 on Age Assurance](https://www.edpb.europa.eu/our-work-tools/our-documents/statements/statement-12025-age-assurance_en)

Quellenstand und nationale Musslisten werden vor Freigabe erneut geprüft.
