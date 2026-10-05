# Pistl UI/UX-Audit — 5. Oktober 2026

## Ziel und Umfang

Die öffentliche Website soll Pistl verständlich machen, Freude beim Entdecken vermitteln und zur Wartelisten-Anmeldung führen. Geprüft wurden Gestaltung, Funktionsverständnis, mobile Nutzung, Tastaturbedienung, Formulare, Fehlerzustände, Metadaten, Rechtsseiten-Verlinkung, Bildauslieferung und die Anmelde-Endpunkte.

## Befunde und umgesetzte Änderungen

| Befund | Umsetzung |
| --- | --- |
| Der Funktionsbereich besteht fast nur aus wiederholten Textzeilen. | Interaktiver Überblick über Rides, Mitfahrten, Crew und Events. Jeder Wechsel zeigt eine eigene typografische Illustration, Nutzen und drei konkrete Schritte. Keine erfundenen Teilnehmer oder buchbaren Demo-Angebote. |
| Einfarbige Flächen und widersprüchliche CSS-Überschreibungen schwächen die Hierarchie. | Konsolidierte Gestaltung mit Schneeweiß, Tannengrün und gezielten Akzentfarben; einheitlich runde Buttons und klarere Abstände. |
| Die Bergillustration wirkt flach und auf Smartphones unscharf. | Kleine scroll- und mausabhängige Ebenenverschiebungen. Das optimierte 2172×724-WebP (224 KB) wird direkt ausgeliefert: Der hohe mobile Bildausschnitt benötigt mehr Pixel als eine auf 100vw verkleinerte Bildversion. Beide Ebenen verwenden dieselbe cachebare Datei. |
| Das mobile Menü unterstützt Escape nicht. | Escape schließt das Menü und gibt den Fokus an den Auslöser zurück. Links schließen das Menü ebenfalls. Navigation bleibt erreichbar. |
| Formularaktion steht vor Auswahl und Zustimmung. | Reihenfolge jetzt E-Mail → Early Access → Einwilligung → Absenden. Größere Zustimmungstexte, eindeutiger Hinweis auf die Bestätigungs-E-Mail. |
| Client bricht nach 12 Sekunden ab, während Speicherung plus E-Mail bis zu 14 Sekunden brauchen können. | Client-Zeitlimit auf 20 Sekunden erhöht. Fehler erhalten die Eingabe; ein positiver HTTP-Status allein behauptet noch keinen Erfolg. |
| Reveal-Effekte können interaktive Inhalte anfangs unsichtbar machen. | Inhalte sind standardmäßig sichtbar. Formular und FAQ werden nicht versteckt. Animationen respektieren `prefers-reduced-motion`. |
| Beim Crew-Artwork ist ein kleiner Text zu kontrastarm. | Textfarbe verdunkelt und alle vier Funktionszustände automatisiert geprüft. |
| Bestätigungs-Endpunkt vertraut für die Body-Grenze allein auf Content-Length. | Tatsächlich eingelesene Bytes werden vor dem Parsen begrenzt; zu große Streams werden abgebrochen. Regressionstests prüfen fehlende/untertriebene Längen und 2048/2049-Byte-Grenzen. |
| Titel und Teilen-Vorschau passen nicht zum aktuellen Einstieg. | Metatitel und Open-Graph-Motiv an „Wer fährt heute wohin?“ angepasst. |
| Lokale Browser-Tests können versehentlich einen anderen laufenden Server prüfen. | Testport über `PLAYWRIGHT_PORT` konfigurierbar; CI verwendet keinen bereits laufenden Server. |

## Verifikation

- Produktions-Build und ESLint erfolgreich.
- 19 Server-/Validierungstests bestanden.
- 13 Playwright-Browsertests bestanden: Formularpräferenzen, Validierung, Fehler/Wiederholung, erfolgreiche Antwort, Double-Opt-in, Tabs und Tastatur, Escape, mobile Navigation, Umbrüche, reduzierte Bewegung, Metadaten, Footer, Logo, 404.
- Axe: keine WCAG 2 A/AA und 2.1-AA-Verstöße in den geprüften Zuständen auf Startseite, Impressum, Datenschutz und Kontakt sowie in allen vier mobilen Feature-Zuständen. Automatisierte Prüfungen ersetzen keine vollständige manuelle Screenreader-Prüfung.
- Layoutprüfung bei 320, 390 und 761 Pixeln; visuelle Prüfung in Desktop- und 390-Pixel-Ansicht. Keine horizontale Seitenüberbreite in den getesteten Feature-Zuständen.
- Browserkonsole der visuellen Sitzung ohne erfasste Warnungen oder Fehler.
- `npm audit --omit=dev`: keine bekannten Schwachstellen.

## Grenzen und offener Wartungspunkt

Die Formular- und E-Mail-Tests verwenden kontrollierte Antworten. Es wurden keine Testadressen in die echte Warteliste eingetragen und keine echten Bestätigungs-E-Mails versendet.

Nach kompatiblen Paketupdates bleiben fünf npm-Audit-Meldungen aus einer gemeinsamen `braces`-Abhängigkeitskette der ESLint-Entwicklungswerkzeuge. npm schlägt dafür ein inkompatibles Downgrade von eslint-config-next auf Version 14 vor. Dieses wurde nicht durchgeführt. Die Produktionsabhängigkeiten sind davon nicht betroffen.

Es wurden keine Feldmessungen der Core Web Vitals und kein Conversion-A/B-Test durchgeführt. Die Verbesserungen beseitigen beobachtete Hürden; ein Anstieg der Anmeldungen ist noch nicht gemessen. Rechtstexte wurden hinsichtlich Erreichbarkeit, Lesbarkeit und Konsistenz der Kontaktdaten geprüft, nicht juristisch zertifiziert.

## Gestaltungsreferenzen

Die öffentlichen Übersichten von [Scrolltide](https://www.scrolltide.co/#library) und [21st.dev](https://21st.dev/community/components/featured) wurden gesichtet. Eingesetzt sind eigene CSS-/React-Implementierungen, das bereits vorhandene Bergmotiv und der zuvor bereitgestellte Jade-Sky-Verlauf. Keine zusätzliche Laufzeitbibliothek, kein WebGL und kein Premium-Code. Details: [Komponenten und Quellen](./component-sources.md).
