# Lösch- und Aufbewahrungskonzept

**Status:** `DRAFT – SCHEDULING IMPLEMENTED, DEPLOYMENT/OBSERVATION REQUIRED`\
**Stand:** 2026-08-03\
**Owner:** `LAUNCH_BLOCKER[RETENTION_OWNER]`\
**Freigabe:** `LAUNCH_BLOCKER[RETENTION_LEGAL_APPROVAL]`

Grundsätze: so kurz wie möglich, so lange wie für den dokumentierten Zweck erforderlich; kein „für alle Fälle“. Die folgenden Fristen sind geplante Maximalfristen. Cleanup-Funktionen und benannte Supabase-Cronjobs liegen als lokale Migrationen vor. Sie wirken erst nach geprüftem Deployment; Monitoring und beobachtete Abnahmeläufe bleiben Freigabekriterien.

## Technischer Stand

| Funktion | Zweck | Geplanter Takt | Stand |
| --- | --- | --- | --- |
| `private.cleanup_expired_location_data` | Position nach 5 Minuten, Session nach Ablauf, Resort-Präsenz nach 24 Stunden | jede Minute | Job `snowmate-location-retention` migrationsfest vorhanden |
| `private.cleanup_data_exports` | kurzlebige JSON-Exporte nach spätestens 24 Stunden | stündlich | Job `snowmate-export-retention` migrationsfest vorhanden |
| `private.cleanup_expired_coordination_data` | Treffpunkt/Abfahrt nach 24 Stunden; alte Einladungen, Requests, Receipts und Ride-Teilnahmehistorie | täglich | Job `snowmate-coordination-retention` migrationsfest vorhanden |
| `private.cleanup_chat_and_moderation_data` | Ride-Chat 90 Tage, DM 12 Monate, Fallinhalt 90 Tage, Metadaten 12 Monate | täglich | Job `snowmate-chat-retention` migrationsfest vorhanden |
| `private.cleanup_account_deletion_jobs` | abgeschlossene Löschakten nach 12 Monaten | täglich | Job `snowmate-deletion-audit-retention` migrationsfest vorhanden |
| `private.invoke_account_deletion_worker` | Storage, Auth, Brevo sowie PostHog-Löschung bei Kontolöschung oder Analytics-Widerruf | alle 5 Minuten | Job vorhanden; protokolliert fehlende Vault-Konfiguration ohne Secrets |
| `private.reconcile_account_deletion_worker_runs` | `pg_net`-Antwort, Timeout, Ergebniszähler und fehlgeschlagene Löschschritte überwachen | alle 5 Minuten | Job `snowmate-account-deletion-worker-monitor` migrationsfest vorhanden |

Alle privaten Funktionen sind für `anon`, `authenticated` und `service_role` gesperrt. Die SQL-Cronjobs laufen innerhalb der Datenbank als kontrollierte Betriebsjobs. Der Account-Worker wird zusätzlich durch ein separates Secret geschützt und verwendet den Supabase-Secret-Key ausschließlich in der Edge Function. Das `net`-Schema samt Request-Queue und Response-Tabelle ist für `PUBLIC`, `anon`, `authenticated` und `service_role` entzogen, damit der Worker-Header nicht über Data-API-Rollen auslesbar ist. Deployment, UTC-Zeitplan, externer Alarmkanal und ein beobachteter Testlauf bleiben Beta-Freigabekriterien.

## Fristenmatrix

| Datenobjekt | Startpunkt | Maximale aktive Frist | Löschaktion | Ausnahme/Prüfung |
| --- | --- | --- | --- | --- |
| Nicht eingelöste Einladung | Ablauf | 30 Tage | Datensatz und E-Mail-Zuordnung löschen | Sicherheits-Sperrhash nur bei dokumentiertem Missbrauch |
| Eingelöste Einladung | Einlösung | 30 Tage | Token/Hash löschen; minimale Audit-ID anonymisieren | Missbrauchsvorfall |
| Konto/Profil/Social Graph | Löschanfrage | sofort deaktivieren; Hard Delete Ziel 24 h, spätestens 7 Tage | Sessions widerrufen, relationale Daten/Storage löschen | gesetzliche Pflicht oder genehmigter Legal Hold |
| Privates Geburtsdatum/Altersband | Kontolöschung | wie Konto | privat löschen | keine eigenständige Archivierung |
| Offene Freundschaft-/Crew-Anfrage | Erstellung | 30 Tage | Anfrage löschen | keine |
| Block-Beziehung | Aufhebung/Kontolöschung | bis Ereignis | Beziehung löschen | Sicherheitsfall: minimierter Nachweis getrennt |
| Ride-/Carpool-Treffpunkt und genaue Abfahrt | Ride-Ende | 24 Stunden | sensible Detailzeile löschen | aktiver Bericht/Incident |
| Privates Pistl-Go-Interesse | geplanter Ride-Beginn | 24 Stunden danach; früher bei Konto- oder Ride-Löschung | `private.cleanup_expired_coordination_data` löscht die private Wunschzeile; Rückzug/Absage beendet die aktive Auswertung sofort | keine eigene Archivierung |
| Sonstige Ride-/Carpool-Koordination | Ride-Ende | `LAUNCH_BLOCKER[RIDE_RETENTION_PERIOD]` | löschen oder irreversibel aggregieren | Verbraucher-/Haftungsprüfung |
| Präzise Live-Position | letzter Heartbeat/Stop | 5 Minuten beziehungsweise sofort | aktuelle Zeile physisch löschen | keine Historie/kein Legal Hold im Live-Store |
| Standort-Session-Metadaten | Session-Ende | 24 Stunden | löschen; nur nicht-personenbezogene Betriebsmetrik aggregieren | gemeldeter Vorfall getrennt sichern |
| Resort-Präsenz | letzte Aktualisierung | 24 Stunden | löschen | keine |
| Ride-Gruppenchat | Ride-Ende | 90 Tage | Nachrichten und Conversation löschen | gemeldeter Ausschnitt getrennt |
| Direktnachrichten | letzte Aktivität | 12 Monate | Conversation/Nachrichten löschen | gemeldeter Ausschnitt getrennt |
| Profilbild-Original | erfolgreiche/fehlgeschlagene Verarbeitung | sofort; fehlgeschlagen max. 1 Stunde | Quarantäneobjekt löschen | Malwareanalyse nur minimiert/isoliert |
| Freigegebener Avatar | Ersatz/Kontolöschung | bis Ereignis | Objekt und Cache-Referenz löschen | Backup-Ablauf |
| Meldungsinhalt/Nachweise | Fall- oder Einspruchsabschluss, je nachdem was später liegt | 90 Tage | Inhalt/Datei löschen | offener Einspruch oder genehmigter Legal Hold |
| Moderationsentscheidung/Audit | Fall- oder Einspruchsabschluss, je nachdem was später liegt | 12 Monate | löschen oder irreversibel anonymisieren | Rechtsverteidigung nach Prüfung |
| DSAR-/Löschakte | Abschluss | 12 Monate | Anfrageinhalt löschen; minimales Frist-/Ergebnisprotokoll prüfen | Rechtsnachweis |
| Sicherheitslogs | Erzeugung | grundsätzlich 30 Tage | rollierend löschen | konkreter Incident, eng begrenzt |
| Breach-/Incident-Akte | Abschluss | `LAUNCH_BLOCKER[INCIDENT_RECORD_RETENTION]` | sicher löschen | gesetzliche Nachweis-/Verjährungsprüfung |
| Brevo-Zustellmetadaten | Versand | grundsätzlich 30 Tage | providerseitig löschen | Bounce-Sperrung minimal erforderlich |
| PostHog-Ereignisse | Erfassung | Analytics ist bis zur technischen und rechtlichen Freigabe deaktiviert; danach höchstens 12 Monate | automatischer TTL; bei Widerruf/Löschung früher | nur nach bestandenem Löschtest einschließlich personenloser Events |
| Supportkommunikation | Abschluss | 12 Monate | löschen | Rechtsanspruch/Incident |
| Datenbankbackup | Erstellung | Ziel 7 Tage | planmäßiges Auslaufen | `LAUNCH_BLOCKER[VERIFY_PROVIDER_BACKUP_RETENTION]` |
| Manuelle Exporte/Restore-Testdaten | Zweckende | höchstens 24 Stunden | sicher löschen und protokollieren | keine |

## Kontolöschung

1. Anfrage über authentifizierte Einstellung oder verifizierten DSAR-Kanal annehmen.
2. Konto sofort sperren, Sessions und Refresh Tokens widerrufen, Standort stoppen, Realtime-Zugriffe schließen.
3. Eine Löschjob-ID erzeugen. Die optionale Analyse-ID stammt ausschließlich aus der serverseitigen Kontozuordnung; der Client kann keine fremde ID einreichen.
4. Primärdaten in referenziell sicherer Reihenfolge löschen: Standort, Sessions, Social/Rides/Chat, Avatar/Storage, Profil, Auth-Konto.
5. PostHog-Löschung für die pseudonyme Analyse-ID und Brevo-Löschung soweit erforderlich anstoßen.
6. Gemeldete Inhalte vorab nur bei gültigem Legal Hold in einen getrennten, minimierten Bereich verschieben.
7. Fehler alarmieren und ohne feste Versuchshöchstzahl idempotent wiederholen; nach spätestens 24 Stunden manuell eskalieren.
8. Abschluss ohne gelöschte Nutzdaten protokollieren und der Person bestätigen.
9. Backup-Ablauf transparent kommunizieren; gelöschte Konten dürfen bei Restore nicht wieder aktiviert werden. Nach Restore ist eine Tombstone-/Reconciliation-Liste anzuwenden.

Das Auth-Konto und die daran kaskadierenden relationalen Primärdaten werden nach erfolgreicher Avatar-Löschung, spätestens aber an der Sieben-Tage-Grenze gelöscht. Diese Grenze ist ein lokales Hard-Delete-Ziel und keine Behauptung, dass ein vorübergehend nicht erreichbarer Drittanbieter bis dahin physisch gelöscht hat. Noch nicht bestätigte Storage-, Brevo- oder PostHog-Schritte laufen in der abgeschotteten Queue weiter; die dafür zwingend benötigte direkte Kennung wird erst nach Providerbestätigung entfernt. Ein überfälliger Providerjob ist ein Betriebs- und Launchvorfall. Pistl bestätigt keine vollständige Löschung, solange der Job nicht insgesamt abgeschlossen ist.

## Automatische Jobs

- `snowmate-location-retention`: jede Minute; ruft `private.cleanup_expired_location_data(statement_timestamp())` auf und löscht abgelaufene präzise Positionen, Sessions und Resort-Präsenz.
- `presence-expiry`: ist im selben idempotenten Standortjob enthalten.
- `snowmate-export-retention`: stündlich; entfernt abgelaufene Export-Snapshots.
- `snowmate-coordination-retention`: täglich; entfernt Treffpunkte/Abfahrtsdetails nach Ride + 24 Stunden sowie abgelaufene Einladungen, Requests und Command-Receipts.
- `snowmate-chat-retention`: täglich; löscht abgelaufene Ride- und Direktnachrichten, nachdem gemeldete Ausschnitte getrennt gesichert wurden.
- `moderation-retention`: ist im selben täglichen Job enthalten; offene Fälle und offene Einsprüche werden nicht bereinigt.
- `snowmate-account-deletion-worker`: alle fünf Minuten mit Retry; verarbeitet höchstens einen Kontolöschjob und einen Analytics-Widerruf pro Lauf.
- `snowmate-account-deletion-worker-monitor`: alle fünf Minuten; übernimmt nur Status, Timeout und feste Fehlercodes aus `pg_net`, niemals Response-Body oder Secrets. Er akzeptiert nur vollständige, begrenzte und rechnerisch konsistente Claim-/Erfolgs-/Fehlerzähler und erkennt überfällige Jobs.
- `snowmate-deletion-audit-retention`: täglich; entfernt abgeschlossene Löschjob-Metadaten nach zwölf Monaten.
- `analytics-retention-audit`: monatlich; verifiziert PostHog-Einstellung und Widerrufs-/Löschqueue.

Jeder Job benötigt Owner, Laufprotokoll ohne Nutzinhalte, Erfolgs-/Fehlerzähler, Alarm, idempotentes Retry und einen monatlichen Stichprobennachweis.

### Worker-Konfiguration

Vor dem ersten externen Test müssen dieselben Werte in Edge-Function-Secrets und Supabase Vault gesetzt werden. Werte selbst gehören nie in Git.

Edge Function:

- `ACCOUNT_DELETION_WORKER_SECRET`
- `BREVO_API_KEY`
- optional erst bei aktiviertem Analytics: `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_API_HOST=https://eu.posthog.com`
- `AVATAR_BUCKET=avatars`

Vault-Namen für den Cron-Aufruf:

- `snowmate_project_url`
- `snowmate_publishable_key`
- `snowmate_account_deletion_worker_secret` mit exakt demselben Worker-Secret

Der PostHog-Key wird auf `person:write` für den Bulk-Delete und `query:read` für die anschließende Event-Abwesenheitsprüfung beschränkt. Der Löschaufruf fordert Person-, Event- und Recording-Löschung an. Eine angenommene Bulk-Anfrage bleibt zunächst `pending`; erst ein späterer Retry darf den Job nach bestätigter Abwesenheit abschließen. Meldet dieser Retry null Personen, gilt er erst dann als abgeschlossen, wenn eine separate Abfrage unter derselben Analyse-ID keine personenlosen Events mehr findet. Bei Widerruf wird die bisherige serverseitig erzeugte Analyse-ID in `private.analytics_erasure_jobs` übernommen. Eine spätere erneute Einwilligung erzeugt eine neue ID, sodass ein alter Retry keine neuen Events löschen kann.

Analytics bleibt technisch doppelt gesperrt: `private.runtime_feature_flags.analytics_collection` ist standardmäßig `false`, und der Browser lädt PostHog nur mit `NEXT_PUBLIC_ANALYTICS_ENABLED=true`. Beide Schalter dürfen erst nach beobachtetem Provider-Löschtest, DPA/TIA- und Rechtsfreigabe aktiviert werden. Solange PostHog für personenlose Events keinen belastbar getesteten Löschweg bietet, bleibt die Funktion aus.

Der Worker beansprucht höchstens zwei Jobs je Lauf: einen Account- und einen Analytics-Löschjob. Jeder Claim erhält ein zufälliges, fünf Minuten gültiges Lease-Token. Nur der aktuelle Claim darf den Job abschließen; nach Ablauf wird ein neues Token vergeben und ein verspäteter älterer Worker abgewiesen. Unabhängige Storage-, Brevo- und PostHog-Schritte starten parallel; Auth folgt erst danach. Provider- und Supabase-Aufrufe haben zehn Sekunden Timeout, der `pg_net`-Aufruf 120 Sekunden. Das bleibt unter Supabases dokumentiertem Request-Idle-Timeout von 150 Sekunden; die Werte müssen nach einem beobachteten Lauf geprüft werden. Siehe [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits) und [pg_net Requests API](https://github.com/supabase/pg_net#requests-api).

## Legal Hold

Ein Legal Hold darf automatische Löschung nur überschreiben, wenn:

- [ ] ein konkreter Rechtsanspruch, behördlicher Auftrag oder schwerer Sicherheitsvorfall dokumentiert ist;
- [ ] betroffene Daten exakt abgegrenzt und vom operativen System getrennt sind;
- [ ] Rechtsgrundlage, genehmigende Person, Start, Reviewdatum und Endkriterium dokumentiert sind;
- [ ] Zugriff auf benannte Personen begrenzt und protokolliert ist;
- [ ] mindestens monatlich überprüft und nach Wegfall unverzüglich gelöscht wird;
- [ ] Live-Standortdaten nicht vorsorglich als Verlauf konserviert werden. Benötigte einzelne Beweise werden fallbezogen und minimiert gesichert.

## Backup und Restore

- [ ] Gebuchter Supabase-Plan, tatsächliche Backupfrist, PITR/Log-Retention und Storage-Backups sind dokumentiert.
- [ ] Vercel-, Brevo- und PostHog-Aufbewahrung außerhalb der Primärdatenbank ist erfasst.
- [ ] Backups werden nicht als Archiv verwendet und sind nur einer minimalen Adminrolle zugänglich.
- [ ] Ein Restore reaktiviert keine gelöschten Konten oder abgelaufenen Standorte.
- [ ] Restore-Testdaten werden innerhalb 24 Stunden gelöscht.
- [ ] Öffentliche Datenschutzerklärung nennt die verifizierte Backup-Nachlaufzeit ohne falsches Sofortlöschversprechen.

## Abnahmetests

- [ ] Mit kontrollierter Uhr werden alle TTL-Grenzen exakt vor/nach Ablauf getestet.
- [ ] Stop, Logout, Block, Sperre und Kontolöschung entfernen Live-Zugriff sofort.
- [ ] Parallele/retryte Löschjobs sind idempotent; aktive Leases verhindern Doppelclaims und alte Tokens können keinen neueren Versuch überschreiben.
- [ ] Ein fehlgeschlagener Provider-Delete bleibt sichtbar und erzeugt Alarm.
- [ ] Ein `pg_net`-Timeout, eine fehlende Response, fehlende oder widersprüchliche Ergebnis-Header und ein Worker-Ergebnis mit fehlgeschlagenen Jobs erscheinen im privaten Laufprotokoll und erreichen den externen Alarmkanal.
- [ ] PostHog-Test umfasst eine Analyse-ID mit Person, eine bereits gelöschte Person und verbleibende personenlose Events.
- [ ] Account-Export nach Löschung enthält keine Primärdaten.
- [ ] Restore mit vorher gelöschtem Testkonto führt zur erneuten Löschung vor Freigabe der Umgebung.
- [ ] Storage/CDN-Cache und signierte URLs sind nach Avatarlöschung unwirksam.
- [ ] Stichprobe beweist, dass Freitext nicht versehentlich in Langzeitlogs liegt.

## Freigabe

- Produkt: `LAUNCH_BLOCKER[PRODUCT_RETENTION_SIGNOFF]`
- Technik: `LAUNCH_BLOCKER[ENGINEERING_RETENTION_SIGNOFF]`
- Recht/Datenschutz: `LAUNCH_BLOCKER[RETENTION_LEGAL_APPROVAL]`
- Nachweisdatum: `LAUNCH_BLOCKER[RETENTION_EVIDENCE_DATE]`
- Nächster Review: spätestens sechs Monate oder bei jeder neuen Datenart/Provideränderung.
