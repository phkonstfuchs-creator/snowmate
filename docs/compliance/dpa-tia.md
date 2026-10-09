# Auftragsverarbeitung und Transfer Impact Assessment

**Status:** `DRAFT – NO PROVIDER APPROVED`\
**Stand:** 2026-08-03\
**Owner:** `LAUNCH_BLOCKER[VENDOR_PRIVACY_OWNER]`\
**Rechtsfreigabe:** `LAUNCH_BLOCKER[PROCESSOR_CONTRACTS_AND_TRANSFERS]`

Ein EU-Rechenzentrumslabel allein beweist keine ausschließlich europäische Verarbeitung. Supportzugriffe, Telemetrie, Netzwerke, Backups, Konzernunternehmen und Unterauftragsverarbeiter müssen getrennt geprüft werden. Diese Datei dokumentiert noch keinen wirksamen AV-Vertrag und keine positive TIA.

## Einheitliche Provider-Checkliste

Für jeden Anbieter:

- [ ] Vertragspartner, Produkt, Tarif und Pistl-Account/Organisation eindeutig dokumentiert.
- [ ] Rollen nach DSGVO je Datenfluss festgelegt: Verantwortlicher, Auftragsverarbeiter oder eigener Verantwortlicher.
- [ ] AVV/DPA nach Art. 28 DSGVO wirksam abgeschlossen und unveränderliche Kopie mit Datum/Version archiviert.
- [ ] Gegenstand, Dauer, Zweck, Datenarten, Betroffene, Weisungen, TOM, Löschung, Audit, DSAR- und Breach-Unterstützung vollständig.
- [ ] Gewählte Datenregion und sämtliche Produkteinstellungen durch Screenshot/Export belegt.
- [ ] Aktuelle Unterauftragsverarbeiterliste mit Funktion und Land archiviert; Änderungsbenachrichtigung abonniert.
- [ ] Übermittlungen außerhalb EWR/Angemessenheitsländer identifiziert, einschließlich Remote Support.
- [ ] Transfermechanismus je Empfänger geprüft: Angemessenheitsbeschluss/DPF oder EU-SCC 2021/914 mit passendem Modul.
- [ ] TIA bewertet Rechtslage, praktische Zugriffserfahrung und zusätzliche Maßnahmen.
- [ ] Lösch-, Export-, Backup- und Vertragsendeprozess praktisch getestet.
- [ ] Incident-Kontakt und vertragliche Benachrichtigungsfrist im Runbook hinterlegt.
- [ ] Nicht benötigte Produkte, Tracking, AI-Funktionen, Supportzugriffe und Integrationen deaktiviert.
- [ ] Ergebnis durch Verantwortlichen und Datenschutzberatung freigegeben; nächste Prüfung terminiert.

## Provider-Matrix

| Anbieter | Geplanter Zweck | Vorgesehene Daten | Region/Transfer-Arbeitsannahme | Status |
| --- | --- | --- | --- | --- |
| Supabase | Auth, PostgreSQL, Storage, Realtime | Konto, Alter privat, Profil, Social Graph, Rides, Chat, Standort, Reports, Avatar | Projekt Frankfurt; Supabase Inc./Unterauftragsverarbeiter und mögliche Zugriffe/transfers separat prüfen | `LAUNCH_BLOCKER[SUPABASE_DPA_TIA]` |
| Vercel | PWA-Hosting, Serverausführung, Deployment/Logs | Requests, notwendige Session-/Serverdaten, minimierte Logs | Function Region `fra1`; Vercel-DPA nennt mögliche Verarbeitung u. a. in den USA/weiteren Ländern | `LAUNCH_BLOCKER[VERCEL_DPA_TIA]` |
| Brevo | ausschließlich Transaktions-E-Mail | E-Mail, Templatezweck, Zustellmetadaten | Brevo beschreibt Datenbankhosting in der EU; Support, Backups, Produktumfang und Unterauftragsverarbeiter trotzdem prüfen | `LAUNCH_BLOCKER[BREVO_DPA_TIA]` |
| PostHog | optionale Produktanalyse nach Opt-in | pseudonyme ID und Event-Allowlist | EU-Cloud wählen; PostHog Inc. und DPA beschreiben mögliche Verarbeitung außerhalb geschützter Region | `LAUNCH_BLOCKER[POSTHOG_DPA_TIA]` |

## Supabase

### Muss-Konfiguration

- [ ] Eigenes Beta-Projekt in `eu-central-1`/Central EU (Frankfurt), getrennt von Entwicklung/Preview.
- [ ] RLS erzwungen; automatische Exposition neuer Tabellen deaktiviert; private Schemas ohne Data-API-Rechte.
- [ ] Storage-Buckets privat; Realtime-Kanäle privat; Service Role ausschließlich serverseitig.
- [ ] Support-/Log-/Backup-/PITR-Umfang und Retention des gebuchten Plans dokumentiert.
- [ ] Supabase-Supportzugriff, Log Drains, Edge Functions und optionale Integrationen auf Notwendigkeit geprüft.

### Vertragsprüfung

- DPA-Version/Datum: `LAUNCH_BLOCKER[SUPABASE_DPA_VERSION]`
- Vertragspartner: `LAUNCH_BLOCKER[SUPABASE_CONTRACTING_ENTITY]`
- Subprocessor-Snapshot/Benachrichtigung: `LAUNCH_BLOCKER[SUPABASE_SUBPROCESSORS]`
- Transfermechanismen/TIA: `LAUNCH_BLOCKER[SUPABASE_TRANSFER_ASSESSMENT]`
- Lösch-/Exit-Test: `LAUNCH_BLOCKER[SUPABASE_DELETE_EXIT_TEST]`

Arbeitsquellen: [Supabase DPA](https://supabase.com/downloads/docs/Supabase%2BDPA%2B260601.pdf), [Regionen](https://supabase.com/docs/guides/platform/regions), [Shared Responsibility](https://supabase.com/docs/guides/deployment/shared-responsibility-model), [Backups](https://supabase.com/docs/guides/platform/backups).

## Vercel

### Muss-Konfiguration

- [ ] Serverfunktionen explizit in Frankfurt (`fra1`) betreiben und Deploy-Ausgabe prüfen.
- [ ] Preview-Umgebungen erhalten keine Beta-Daten oder Beta-Secrets.
- [ ] Request-/Function-Logs minimieren; keine Texte, Geburtsdaten, Social Graphs oder Koordinaten.
- [ ] Analytics, Speed Insights, Log Drains und sonstige Telemetrie nur nach eigener Datenschutzprüfung aktivieren.
- [ ] Cache-Header verhindern Caching privater/standortbezogener Antworten.

### Vertragsprüfung

- DPA-Version/Datum: `LAUNCH_BLOCKER[VERCEL_DPA_VERSION]`
- US-/weltweite Verarbeitung und SCC-Module: `LAUNCH_BLOCKER[VERCEL_TRANSFER_ASSESSMENT]`
- Subprocessor-Snapshot und Änderungsnotice: `LAUNCH_BLOCKER[VERCEL_SUBPROCESSORS]`
- Service-generated data/Controller-Rollen: `LAUNCH_BLOCKER[VERCEL_ROLE_SPLIT]`
- Lösch-/Exit-Test: `LAUNCH_BLOCKER[VERCEL_DELETE_EXIT_TEST]`

Arbeitsquellen: [Vercel DPA](https://vercel.com/legal/dpa), [Vercel Regions](https://vercel.com/docs/functions/configuring-functions/region), [Security & Compliance](https://vercel.com/docs/security/compliance).

## Brevo

### Muss-Konfiguration

- [ ] Nur SMTP/transaktionale Templates; Marketing, CRM-Anreicherung, Tracking und Kampagnen deaktiviert.
- [ ] E-Mails enthalten keine Live-Position, Chattexte, Geburtsdaten oder vollständige Moderationsnachweise.
- [ ] SPF, DKIM, DMARC und TLS geprüft; Absender und Reply-Kanal besetzt.
- [ ] Zustelllogs/Bounces auf freigegebene Frist begrenzt; Kontaktlöschung getestet.
- [ ] Backup- und Archivnachlauf schriftlich geklärt.

### Vertragsprüfung

- AVV/DPA-Version/Datum und Wirksamkeit: `LAUNCH_BLOCKER[BREVO_DPA_VERSION]`
- Vertragspartner/Produkt: `LAUNCH_BLOCKER[BREVO_CONTRACTING_ENTITY]`
- Hosting-/Support-/Subprocessor-Snapshot: `LAUNCH_BLOCKER[BREVO_SUBPROCESSORS]`
- Transfermechanismen/TIA, falls Zugriff außerhalb EWR möglich: `LAUNCH_BLOCKER[BREVO_TRANSFER_ASSESSMENT]`
- Lösch-/Exit-Test: `LAUNCH_BLOCKER[BREVO_DELETE_EXIT_TEST]`

Arbeitsquellen: [Brevo: Speicherort der Daten](https://help.brevo.com/hc/de/articles/360001005510-Speicherort-der-Daten), [Brevo: Datenschutzinformationen](https://help.brevo.com/hc/de/articles/360001258744-Wie-h%C3%A4lt-Brevo-die-DSGVO-ein). Anbieterangaben werden nicht ungeprüft als Pistl-Garantie übernommen.

## PostHog

### Muss-Konfiguration

- [ ] EU-Projekt/Endpoint gewählt und über Browsernetzwerk verifiziert.
- [ ] SDK wird vor Opt-in nicht geladen; Ablehnung lädt keine PostHog-Ressource.
- [ ] Private Datenbankfreigabe und expliziter Browser-Build-Schalter bleiben bis zur vollständigen Abnahme deaktiviert.
- [ ] Autocapture, Session Replay, Surveys, Personenprofile, Geo-IP-Anreicherung und AI-Funktionen deaktiviert, sofern nicht später gesondert freigegeben.
- [ ] Event-Allowlist und Property-Schema verhindern Name, E-Mail, Handle, Freitext, Beziehungen, Ride-Details und Koordinaten.
- [ ] Zufällige Analyse-ID; kein Auth-User-ID-Reuse. Asynchrone Providerlöschung, bereits fehlende Person und verbleibende personenlose Events bei Widerruf/Kontolöschung getestet.
- [ ] Retention höchstens zwölf Monate eingestellt und exportiert belegt.

### Vertragsprüfung

- Gegengezeichneter DPA aus der konkreten PostHog-Organisation: `LAUNCH_BLOCKER[POSTHOG_COUNTERSIGNED_DPA]`
- EU-Datacenter und Subprocessor-Snapshot: `LAUNCH_BLOCKER[POSTHOG_SUBPROCESSORS]`
- DPF/SCC/TIA für PostHog Inc. und Zugriffe außerhalb geschützter Region: `LAUNCH_BLOCKER[POSTHOG_TRANSFER_ASSESSMENT]`
- Lösch-/Exit-Test: `LAUNCH_BLOCKER[POSTHOG_DELETE_EXIT_TEST]`

Arbeitsquellen: [PostHog DPA](https://posthog.com/dpa), [PostHog Subprocessors](https://posthog.com/subprocessors), [Privacy Docs](https://posthog.com/docs/privacy), [Trust Center](https://trust.posthog.com/). Die öffentliche DPA-Ansicht ist laut Anbieter nur Vorschau; die gegengezeichnete Fassung muss aus der Organisation generiert werden.

## TIA-Vorlage pro Transfer

### A. Transfer beschreiben

- Exporteur/Importeur/Unterauftragsverarbeiter: `LAUNCH_BLOCKER[TIA_PARTIES]`
- Länder und Remote-Zugriff: `LAUNCH_BLOCKER[TIA_COUNTRIES]`
- Daten/Betroffene/Zweck/Häufigkeit/Dauer: `LAUNCH_BLOCKER[TIA_TRANSFER_DETAILS]`
- Verschlüsselung und wer Schlüsselzugriff hat: `LAUNCH_BLOCKER[TIA_KEY_ACCESS]`
- Transfermechanismus und SCC-Modul: `LAUNCH_BLOCKER[TIA_TRANSFER_MECHANISM]`

### B. Rechtslage und Praxis bewerten

- [ ] Relevante Überwachungs-/Zugriffsbefugnisse und Rechtsbehelfe im Empfängerland mit qualifizierter Beratung analysiert.
- [ ] Transparenzberichte, behördliche Anfragen und Anbietererfahrung aktuell geprüft.
- [ ] DPF-Status, falls verwendet, am Freigabetag verifiziert und Monitoring eingerichtet.
- [ ] Weiterübermittlungen und Subprocessor-Länder vollständig einbezogen.
- [ ] Besondere Risiken durch Minderjährige, Social Graph, Chat, Moderation und präzise Position gewichtet.

### C. Zusätzliche Maßnahmen

- [ ] Daten vor Übermittlung minimieren/pseudonymisieren; Klardaten und Zuordnung getrennt halten.
- [ ] Transport und Speicherung verschlüsseln; prüfen, ob allein Pistl Schlüssel kontrollieren kann.
- [ ] Keine präzisen Standorte, Nachrichten oder Geburtsdaten an Analytics/E-Mail/Hostinglogs senden.
- [ ] Rollen, Supportzugriff, Audit, kurze Retention und behördliche-Anfrage-Policy vertraglich/technisch begrenzen.
- [ ] Feature deaktivieren, wenn Schutz nicht ausreicht oder Providerstatus sich ändert.

### D. Entscheidung

- Schutzniveau im Wesentlichen gleichwertig: `LAUNCH_BLOCKER[TIA_EQUIVALENCE_DECISION]`
- Offene Risiken/Maßnahmen: `LAUNCH_BLOCKER[TIA_OPEN_ACTIONS]`
- Entscheidung Freigeben/Ablehnen: `LAUNCH_BLOCKER[TIA_FINAL_DECISION]`
- Verantwortlicher/Datenschutzberatung/Datum: `LAUNCH_BLOCKER[TIA_SIGNOFF]`
- Recheck: mindestens jährlich sowie bei Subprocessor-, Länder-, Vertrags- oder Funktionsänderung.

## Launch-Abnahme

- [ ] Vier wirksame AVV/DPA-Versionen archiviert.
- [ ] Vier aktuelle Subprocessor-Snapshots und Benachrichtigungen eingerichtet.
- [ ] Jede Übermittlung hat konkrete Transfergrundlage und abgeschlossene TIA.
- [ ] Tatsächliche Providerkonfiguration stimmt mit ROPA und Datenschutzerklärung überein.
- [ ] Vertragsende, DSAR, Löschung, Incident und Audit-Unterstützung praktisch verifiziert.
- [ ] Keine öffentliche Aussage „nur EU“, wenn Support, Unterauftragsverarbeitung oder Transfer dies nicht trägt.

**Finale Freigabe:** `LAUNCH_BLOCKER[PROCESSOR_CONTRACTS_AND_TRANSFERS]`
