# Technische und organisatorische Maßnahmen (TOM)

**Status:** `DRAFT – IMPLEMENTATION AND EVIDENCE REQUIRED`\
**Stand:** 2026-08-03\
**Owner:** `LAUNCH_BLOCKER[SECURITY_OWNER]`\
**Freigabe:** `LAUNCH_BLOCKER[TOM_FORMAL_APPROVAL]`

Diese Checkliste beschreibt den für die Closed Beta vorgesehenen Schutz nach Art. 32 DSGVO. Ein nicht abgehakter Punkt ist nicht umgesetzt oder noch nicht belegt. Ein Haken benötigt einen Link auf Test, Konfiguration, Protokoll oder unterschriebenen Prozessnachweis.

## 1. Governance und Rollen

- [ ] Verantwortlicher, Security Owner, Datenschutzkontakt, Incident Lead, Moderationsverantwortlicher und Stellvertretungen sind namentlich intern dokumentiert.
- [ ] Betreiber- und Providerkonten sind personengebunden; geteilte Admin-Konten sind verboten.
- [ ] Admin-Zugriffe folgen Least Privilege und werden mindestens quartalsweise überprüft.
- [ ] MFA ist für GitHub, Supabase, Vercel, Brevo, PostHog und primäre E-Mail-Konten erzwungen.
- [ ] On-/Offboarding entzieht Zugriffe innerhalb von vier Stunden; Entzug wird protokolliert.
- [ ] Vertraulichkeits- und Moderationsanweisungen sind akzeptiert.
- [ ] Externe Supportzugriffe benötigen Ticket, Zweck, Zeitfenster und nachträgliche Kontrolle.

**Evidenz:** `LAUNCH_BLOCKER[ACCESS_CONTROL_EVIDENCE]`

## 2. Umgebungs- und Datentrennung

- [ ] Lokal, CI, Integration (`snowmate-dev`) und externe Beta (`snowmate-beta`) verwenden getrennte Supabase-Projekte und Schlüssel.
- [ ] Externe Personen erhalten ausschließlich Zugang zur Beta-Umgebung.
- [ ] Production/Beta-Daten werden nicht in Preview, Tests, lokale Seeds oder Support-Screenshots kopiert.
- [ ] Vercel-Preview-Deployments sind gegen Produktiv-/Beta-Secrets gesperrt.
- [ ] Datenbankmigrationen sind additiv, reviewpflichtig und werden vor Beta-Anwendung in einer leeren sowie repräsentativen Testdatenbank ausgeführt.
- [ ] Neue öffentliche Tabellen erhalten nicht automatisch Data-API-Rechte; RLS ist erzwungen.

**Evidenz:** `LAUNCH_BLOCKER[ENVIRONMENT_SEPARATION_EVIDENCE]`

## 3. Identität und Authentifizierung

- [ ] Public Signup ist durch serverseitig erzwungene, einmalige, E-Mail-gebundene und ablaufende Einladungen geschützt.
- [ ] Vor Signup sind die gültigen Dokumente erreichbar; Annahmeversion/-zeit werden serverseitig protokolliert und optionale Einwilligungen nicht gebündelt.
- [ ] Unter 16 wird vor Kontoerstellung abgewiesen; direkte Auth-API-Aufrufe können Invite-/Age-Prüfung nicht umgehen.
- [ ] Passwortvorgaben, Leaked-Password-Prüfung, Rate Limits und Bot-/Abuse-Schutz sind konfiguriert und getestet.
- [ ] Auth-Cookies sind `Secure`, `HttpOnly` soweit technisch anwendbar, `SameSite`-geeignet und kurzlebig.
- [ ] Session-Widerruf funktioniert bei Logout, Kontosperre, Block-Sicherheitsvorfall und Löschanfrage.
- [ ] Passwort-Reset und E-Mail-Wechsel verraten nicht, ob ein fremdes Konto existiert.

**Evidenz:** `LAUNCH_BLOCKER[AUTH_SECURITY_EVIDENCE]`

## 4. Autorisierung und Datenminimierung

- [ ] Authentifizierungsidentität stammt ausschließlich aus der verifizierten Server-Session, nie aus einer Client-UID.
- [ ] RLS-Tests decken anonym, unrelated, Friends-of-Friends, pending, friend, accepted participant, blocked und minor negativ und positiv ab.
- [ ] Ein Block überstimmt Freundschaft, Crew, Ride und Realtime sofort.
- [ ] Minderjährige sind aus Friends-of-Friends-Discovery ausgeschlossen.
- [ ] Feed-/Discovery-DTOs enthalten weder Treffpunkt noch Koordinaten, private Geburtsdaten, E-Mail oder interne IDs ohne Zweck.
- [ ] Service-Role-Schlüssel ist ausschließlich serverseitig, rotiert und nie in Browserbundles, Logs oder Git-Historie enthalten.
- [ ] Realtime-Kanäle sind privat und prüfen die Mitgliedschaft beim Join sowie nach Zustandsänderungen erneut.

**Evidenz:** `LAUNCH_BLOCKER[RLS_AND_DTO_TEST_REPORT]`

## 5. Standortschutz

- [ ] Keine Standortberechtigung beim App-Start; Start nur nach eindeutiger Aktion mit kontextueller Erklärung.
- [ ] Manuelle Resort-Auswahl bietet eine echte Alternative.
- [ ] PWA sendet nur im Vordergrund und beendet die Session bei Stop, Logout, Sperre und Kontolöschung.
- [ ] Datenmodell speichert nur den letzten Punkt, keinen Verlauf; Datenbankconstraint verhindert historische Inserts außerhalb des vorgesehenen Upserts.
- [ ] Fünf-Minuten-TTL und sofortige Stop-Löschung laufen serverseitig und alarmieren bei Fehlern.
- [ ] Session läuft standardmäßig vier, maximal acht Stunden; Verlängerung erfordert erneute Handlung.
- [ ] Koordinaten werden aus Analytics, Application Logs, URLs, Fehlertexten und E-Mails ausgeschlossen.
- [ ] Präzise Sichtbarkeit entspricht der RLS-Matrix und ist für Minderjährige ausschließlich bestätigten Freunden möglich.

**Evidenz:** `LAUNCH_BLOCKER[LOCATION_SECURITY_TEST_REPORT]`\
**Freigabegate:** `LAUNCH_BLOCKER[LOCATION_LEGAL_BASIS_AND_DPIA]`

## 6. Verschlüsselung und Secrets

- [ ] TLS wird für Browser, Supabase, Brevo und PostHog erzwungen; Mixed Content ist blockiert.
- [ ] Provider-Verschlüsselung ruhender Daten ist vertraglich/technisch dokumentiert.
- [ ] Besonders schützenswerte Spalten und Backups werden auf zusätzliche applikationsseitige Verschlüsselung geprüft.
- [ ] Secrets liegen nur in freigegebenen Secret Stores; `.env*`, Logs, Screenshots und Tickets enthalten keine Werte.
- [ ] Secret-Rotation ist dokumentiert und mindestens halbjährlich sowie nach Verdacht durchführbar.
- [ ] Git-Historie und Builds werden automatisiert auf Secrets geprüft.

**Evidenz:** `LAUNCH_BLOCKER[ENCRYPTION_AND_SECRET_EVIDENCE]`

## 7. Avatar- und Datei-Sicherheit

- [ ] Nur Profilbilder sind erlaubt; Chat und Ride bleiben textbasiert.
- [ ] Uploads landen in einem privaten Quarantänebereich.
- [ ] Dateigröße, Magic Bytes, MIME, Pixelgrenzen und Bilddecoding werden serverseitig geprüft.
- [ ] Bilder werden neu codiert, EXIF und Metadaten entfernt, auf feste Dimensionen begrenzt und erst nach Freigabe sichtbar.
- [ ] Originale werden nach Verarbeitung gelöscht; fehlgeschlagene Uploads laufen automatisch ab.
- [ ] Auslieferung erfolgt über kurzlebige signierte URLs mit passender Cache-Policy.
- [ ] Missbrauchs- und Malwaretests sind dokumentiert.

**Evidenz:** `LAUNCH_BLOCKER[AVATAR_PIPELINE_EVIDENCE]`

## 8. Anwendungssicherheit und SDLC

- [ ] Eingaben werden an jeder Servergrenze schema-basiert validiert und durch Datenbankconstraints abgesichert.
- [ ] Mutationen verwenden Rate Limit und Idempotency-Key; Ride-/Carpool-Kapazität wird transaktional gesichert.
- [ ] CSP und Permissions-Policy erlauben nur benötigte Supabase-, eigene Karten- und nach Opt-in PostHog-Verbindungen.
- [ ] Service Worker cached ausschließlich versionierte öffentliche Assets, niemals Profile, Chats, Standort- oder Auth-Antworten.
- [ ] CI führt Lint, Typecheck, Unit/Integration/E2E, pgTAP, Coverage >=80 %, Build, Secret Scan und Dependency Audit aus.
- [ ] Änderungen an RLS, Auth, Moderation, Standort oder Löschung erhalten Security Review vor Merge.
- [ ] Kritische Abhängigkeiten werden vor Beta behoben oder mit Ablaufdatum risikobewusst akzeptiert.

**Evidenz:** `LAUNCH_BLOCKER[SDLC_SECURITY_EVIDENCE]`

## 9. Protokollierung und Monitoring

- [ ] Logs enthalten keine Passwörter, Tokens, Nachrichteninhalte, Social-Graph-Listen, Geburtsdaten oder präzise Koordinaten.
- [ ] Sicherheitslogs sind manipulationsgeschützt, rollenbeschränkt und grundsätzlich auf 30 Tage begrenzt.
- [ ] Alarmierung besteht für Auth-Anomalien, Admin-Aktionen, fehlgeschlagene Löschjobs, Moderations-SLA, Backupfehler und ungewöhnliche Datenexporte.
- [ ] Alarmkanal und Bereitschaft sind getestet; Warnungen haben Owner und Runbook.
- [ ] Debug-Logging kann nicht unkontrolliert in der Beta aktiviert werden.

**Evidenz:** `LAUNCH_BLOCKER[LOGGING_MONITORING_EVIDENCE]`

## 10. Verfügbarkeit, Backup und Wiederherstellung

- [ ] Supabase-Backupumfang und -frist entsprechen dem gebuchten Plan und der Retention-Dokumentation.
- [ ] Wiederherstellung wird vor Beta und mindestens quartalsweise in isolierter Umgebung getestet.
- [ ] Restore-Protokoll enthält RPO, RTO, Dauer, Prüfsummen/Stichprobe und erkannte Lücken.
- [ ] Backups oder Exporte werden verschlüsselt, zugriffsbeschränkt, inventarisiert und fristgerecht vernichtet.
- [ ] Feature-Schalter können Standort, Chat und Analytics unabhängig deaktivieren; Analytics benötigt getrennte Freigaben in Datenbank und Browser-Build.
- [ ] Notfallbetrieb verhindert neue Standort-/Chatdaten, wenn sichere Autorisierung nicht garantiert werden kann.

**Evidenz:** `LAUNCH_BLOCKER[RESTORE_TEST_EVIDENCE]`

## 11. Löschung und Betroffenenrechte

- [ ] Löschjobs decken Primärdaten, Storage, Realtime-Reste, Analytics und Providerdaten ab; Analytics-Widerruf nutzt eine getrennte retrybare Queue und rotiert die ID bei erneuter Einwilligung.
- [ ] Kontolöschung deaktiviert Konto und Sessions sofort; Hard Delete folgt innerhalb der freigegebenen Frist.
- [ ] Löschfehler erzeugen Alert, Retry und manuelle Queue; kurzlebige Lease-Tokens verhindern veraltete Worker-Antworten und Ergebnis-Header werden strikt validiert.
- [ ] Export enthält nur Daten der anfragenden Person und entfernt Daten Dritter, soweit erforderlich.
- [ ] DSAR und Löschung wurden mit Erwachsenem, Minderjährigem, blockierter Verbindung, Chat, Meldung und Standort getestet.
- [ ] Legal Holds sind einzeln begründet, genehmigt, befristet und regelmäßig überprüft.

**Evidenz:** `LAUNCH_BLOCKER[DSAR_AND_DELETION_EVIDENCE]`

## 12. Incident Response und Lieferkette

- [ ] Data-Breach-Runbook, Kontaktliste und 72-Stunden-Timer sind erreichbar, auch wenn Pistl-Systeme ausfallen.
- [ ] Provider-Breach-Kontakte und vertragliche Meldefristen sind dokumentiert.
- [ ] Tabletop umfasst Account Takeover, Standortleck, Minor-Doxxing, öffentliches Storage-Objekt und kompromittiertes Admin-Konto.
- [ ] Supabase-, Vercel-, Brevo- und PostHog-Status-/Security-Hinweise werden überwacht.
- [ ] Unterauftragsverarbeiteränderungen haben Owner, Widerspruchsfrist und dokumentierte Bewertung.
- [ ] Kritische Vorfälle können externe Rechts-/Forensikunterstützung auslösen, ohne Daten unkontrolliert weiterzugeben.

**Evidenz:** `LAUNCH_BLOCKER[INCIDENT_AND_VENDOR_EVIDENCE]`

## Formale Abnahme

- [ ] Alle Kontrollen haben Owner, Frequenz und Evidenzlink.
- [ ] Nicht anwendbare Kontrollen enthalten Begründung und Freigabe.
- [ ] Offene hohe/kritische Findings: 0.
- [ ] DPIA-Rest-Risiken stimmen mit dieser TOM-Version überein.
- [ ] Nächster Reviewtermin ist höchstens sechs Monate entfernt oder früher bei wesentlicher Änderung.

**Security Owner:** `LAUNCH_BLOCKER[SECURITY_OWNER_SIGNOFF]`\
**Verantwortlicher:** `LAUNCH_BLOCKER[CONTROLLER_SIGNOFF]`\
**Datum:** `LAUNCH_BLOCKER[TOM_APPROVAL_DATE]`

## pg_net: Rechteentzug durch den Extension-Eigentümer

`pg_net` kann `supabase_admin` gehören. Reguläre Migrationen als `postgres` können dessen ACL nicht entziehen; PostgreSQL meldet dabei nur eine Warnung. Deshalb muss [harden-pg-net.sql](../../supabase/operations/harden-pg-net.sql) nach dem Aufbau beziehungsweise Update der Extension durch deren Eigentümer oder einen Datenbankadministrator ausgeführt werden. Das Skript bricht bei unzureichenden Rechten oder verbleibendem Clientzugriff ab. Schema, Warteschlange, Antworten und HTTP-Funktionen dürfen für `anon`, `authenticated` und `service_role` nicht zugänglich sein.

Lokal und in CI nach `supabase db reset` (Containername verwendet die `project_id` aus `supabase/config.toml`):

```sh
docker exec -i supabase_db_snowmate-dev psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 --single-transaction < supabase/operations/harden-pg-net.sql
```

Für eine gehostete Umgebung muss der Betreiber die SQL-Datei mit einem freigegebenen Extension-Eigentümer-/Administratorzugang anwenden. Der reguläre `postgres`-Zugang reicht bei Eigentümer `supabase_admin` nicht aus; gegebenenfalls muss Supabase die ACL korrigieren. Keine Rollenmitgliedschaft oder zusätzlichen Superuserrechte für Anwendungskonten vergeben. Nach Extension-Updates erneut anwenden und `security_review_hardening.test.sql` sowie `session_profile_and_net_access.test.sql` ausführen. Eine nicht angewandte oder fehlgeschlagene Härtung blockiert die Beta-Freigabe.
