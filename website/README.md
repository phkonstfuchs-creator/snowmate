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

1. Die isolierte SQL-Migration `supabase/migrations/202610040001_pistl_website_waitlist.sql` im bestehenden Supabase-Projekt prüfen und ausführen. Sie legt zwei neue Tabellen und eine serverseitige Funktion an, verändert aber keine App-Tabellen.
2. `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` bzw. serverseitig in Vercel setzen. Den Service-Key niemals mit `NEXT_PUBLIC_` benennen, in Git speichern oder im Browser ausliefern. Optional einen eigenen `WAITLIST_RATE_LIMIT_SECRET` setzen.
3. Anbietername, Anschrift und Kontakt-E-Mail konfigurieren. Die rechtlichen Entwürfe mit tatsächlicher Hosting-Region, Verantwortlichem und Löschablauf vervollständigen. Eine passende Aufbewahrungsfrist festlegen und die regelmäßige Löschung organisatorisch oder technisch umsetzen.
4. Mit einer eigenen Testadresse prüfen, dass eine Zeile in `pistl_website_waitlist` entsteht. Das Formular versendet derzeit keine automatischen Bestätigungsmails. Die Erfolgsmeldung bestätigt allein die gespeicherte Anmeldung.
5. Für Einladungen nur Datensätze mit `early_access = true` verwenden. Abmeldung/Widerruf wird vorerst manuell über die konfigurierte Kontaktadresse verarbeitet. Kein allgemeiner Newsletter ist Teil dieser Einwilligung. Double-Opt-in und eine Versandlösung sind vor automatisierten Marketingkampagnen separat einzurichten.

Der API-Endpunkt nimmt `{ email, earlyAccess, consent: true, website: "" }` entgegen. Validierung, Honeypot, 2-KB-Bodylimit, Same-Origin-Prüfung, Timeout und Datenbank-Anfragelimit sind enthalten. RLS sperrt öffentliche Zugriffe; nur die serverseitige Rolle darf die RPC ausführen. E-Mail-Duplikate werden ohne Offenlegung vorhandener Anmeldungen behandelt. Nachträgliches Early-Access-Interesse bekommt einen eigenen Einwilligungszeitpunkt.

Auf Vercel wird der vom Hosting gesetzte Client-IP-Header gehasht; außerhalb Vercels verwenden Anfragen bewusst einen gemeinsamen Bucket (fünf pro Stunde). Für einen anderen Produktivhost muss zuerst ein vertrauenswürdiger Proxy-Header integriert werden. Alte Rate-Limit-Einträge werden bei angenommenen Anmeldungen bereinigt, wenn deren Zeitfenster mehr als 24 Stunden alt ist.

## Vercel

- Neues Vercel-Projekt mit **Root Directory `website`** und Framework **Next.js**.
- Node-Version 24, Build `npm run build`, Standard-Ausgabeverzeichnis.
- Server-Umgebungsvariablen wie oben; `NEXT_PUBLIC_SITE_URL` auf die echte HTTPS-Domain setzen.
- `PISTL_LAUNCH_READY=true` erst nach Abschluss der offenen Betreiber-/Datenschutzangaben setzen und neu bauen. Bis dahin bleiben Robots/Metadaten auf `noindex`.
- `npm run check:launch` zeigt fehlende Konfiguration, ohne Geheimnisse auszugeben.

Es wurde kein Deployment und keine Änderung an einer entfernten Datenbank durchgeführt.

## Prüfen

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

Die End-to-End-Tests simulieren Antworten der Wartelisten-API und senden keine Adressen an Supabase. SQL ist separat gegen die Zielumgebung zu prüfen. Node-Testabdeckung: `node --test --experimental-test-coverage tests/*.test.mjs`.

## Projektstruktur

```text
website/
  app/
    api/waitlist/route.js     API zur Supabase-Warteliste
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
  supabase/migrations/       Isolierte SQL-Migration
  tests/                     API-/Validierungs- und Browser-Tests
  scripts/check-launch.mjs   Konfigurationsprüfung vor dem Start
  docs/component-sources.md  Konkrete Komponentenquellen und Bildprompt
```

Alle Quellen und die Unterscheidung zwischen übernommenem Code und gestalterischer Referenz stehen in `docs/component-sources.md`.
