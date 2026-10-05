# Pistl – öffentliche Website

Eigenständiges Next.js-Projekt für die Warteliste und Early Access. Die öffentliche Website heißt Pistl; die separat entwickelte App im übergeordneten Ordner ist noch nicht umbenannt. Node.js 24, Next.js 16, React 19 und Tailwind 4. Keine Browser-API-Schlüssel, keine Analyse-Cookies, lokale Schriftarten.

## Lokal starten

```sh
cd website
npm install
cp .env.example .env.local
npm run dev
```

Website: http://localhost:3001. Ohne Supabase-Konfiguration funktionieren alle Informationsseiten. Das Formular meldet fehlende Speicherung ehrlich als Fehler und zeigt keinen falschen Erfolg. Im bestehenden Checkout können zunächst die bereits installierten Pakete im Elternordner genutzt werden.

## Warteliste aktivieren

1. Die Migrationen liegen in der Migrationskette der App: `supabase/migrations/20261007090000_website_waitlist.sql` und `20261009090000_website_waitlist_double_opt_in.sql` (Tests: `supabase/tests/database/website_waitlist.test.sql`). Im Repository-Hauptverzeichnis mit `npx supabase db push` einspielen – nicht von Hand im SQL-Editor. Sie verändern keine App-Tabellen.
2. Serverseitig in Vercel setzen (nie mit `NEXT_PUBLIC_`, nie in Git):
   - `SUPABASE_URL` – Projekt-URL, z. B. `https://<ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` – der *Secret*/Service-Role-Key aus Supabase → Project Settings → API Keys. Nur im Website-Projekt, nicht im App-Projekt.
   - `WAITLIST_RATE_LIMIT_SECRET` – 32+ zufällige Zeichen (`openssl rand -hex 32`).
   - `NEXT_PUBLIC_SITE_URL` – die echte HTTPS-Domain der Website. Aus ihr entsteht der Bestätigungslink.
   - `RESEND_API_KEY` – API-Key aus Resend (nur „Sending access“, auf die Domain beschränkt).
   - `WAITLIST_FROM_EMAIL` – Absender auf der in Resend bestätigten Domain, z. B. `Pistl <hallo@pistl.app>`.
3. Betreiberangaben stehen in `lib/site.js` (echte Angaben des Betreibers, per Umgebungsvariable überschreibbar).
4. Mit einer eigenen Adresse testen: Es entsteht eine unbestätigte Zeile in `pistl_website_waitlist` und eine E-Mail mit Bestätigungslink. Der Link öffnet `/warteliste/bestaetigen`; erst der Button dort setzt `confirmed_at` (E-Mail-Scanner, die Links öffnen, bestätigen also nicht). Die Datenbank speichert nur den SHA-256-Wert des Links. Unbestätigte Anmeldungen werden nach sieben Tagen gelöscht; pro Adresse geht höchstens alle fünf Minuten eine E-Mail raus.
5. Für Mails und Einladungen nur Datensätze mit `confirmed_at is not null` verwenden, für Early Access zusätzlich `early_access = true`. Widerruf und Löschung per E-Mail an die Kontaktadresse; spätestens zwölf Monate nach dem öffentlichen Start der App werden alle Einträge gelöscht (Datenschutzerklärung).

Der API-Endpunkt nimmt `{ email, earlyAccess, consent: true, website: "" }` entgegen. Validierung, Honeypot, 2-KB-Bodylimit, Same-Origin-Prüfung, Timeout und Datenbank-Anfragelimit (fünf pro Stunde und Besucher) sind enthalten. Ohne Supabase- oder Resend-Konfiguration antwortet er ehrlich mit 503, ebenso wenn die Bestätigungs-E-Mail nicht verschickt werden konnte.

## Vercel

Domains: die Website läuft auf `pistl.app` (und `www.pistl.app`), die App im selben Repository auf `app.pistl.app`. Frühere App-Links auf `pistl.app` (Bestätigungs- und Einladungsmails, Homescreen-Icons) leitet `next.config.mjs` vorübergehend (307) an `app.pistl.app` weiter; abweichend per `PISTL_APP_URL`.

- Eigenes Vercel-Projekt mit **Root Directory `website`**, Framework Next.js, Node 24. Funktionen laufen in Frankfurt (`vercel.json`).
- Umgebungsvariablen wie oben; `PISTL_LAUNCH_READY=true` erst setzen, wenn die Seite indexiert werden soll (sonst `noindex`).
- `npm run check:launch` zeigt fehlende Konfiguration, ohne Werte auszugeben.

## Prüfen

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

Die End-to-End-Tests simulieren Antworten der Wartelisten-API und senden keine Adressen an Supabase. Die SQL-Funktion ist mit pgTAP getestet (`supabase/tests/database/website_waitlist.test.sql`). Node-Testabdeckung: `node --test --experimental-test-coverage tests/*.test.mjs`.

## Projektstruktur

```text
website/
  app/
    api/waitlist/route.js     API zur Supabase-Warteliste (Anmeldung + Bestätigungs-E-Mail)
    api/waitlist/confirm/     Bestätigung per Button (Double-Opt-in)
    warteliste/               Bestätigungsseiten
    datenschutz/page.jsx     Datenschutzentwurf
    impressum/page.jsx       Anbieterkennzeichnung
    kontakt/page.jsx         Kontakt
    globals.css              Layout, mobile Ansichten, Animation
    icon.svg                 Pistl-Favicon
    apple-icon.jsx           Pistl-Icon für den Homescreen
    layout.jsx               Sprache, Metadaten, Schriften
    not-found.jsx            Eigene 404-Seite
    opengraph-image.jsx       Teilbares Vorschaubild
    page.jsx                 Öffentliche Landingpage
    robots.js / sitemap.js   Suchmaschinen-Konfiguration
  components/                Hero, bewegte Bergszene, App-Vorschau, Tabs, Formular, Navigation
  components/ui/             ActionButton
  lib/                       Website-Konfiguration und Wartelistenlogik
  public/                    Lokale Marke und optimierte Bergillustration
  tests/                     API-/Validierungs- und Browser-Tests
  scripts/check-launch.mjs   Konfigurationsprüfung vor dem Start
  docs/component-sources.md  Konkrete Komponentenquellen und Bildprompt
```

Alle Quellen und die Unterscheidung zwischen übernommenem Code und gestalterischer Referenz stehen in `docs/component-sources.md`.
