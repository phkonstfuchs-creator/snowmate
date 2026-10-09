# Pistl: Wettbewerbsanalyse und Qualitätsstrategie

Stand: 9. Oktober 2026. Gegenstand: lokaler Arbeitsstand im Repository Pistl;
der vorhandene Founder-Plan nennt das Produkt Pistl. Keine Annahme über eine
andere veröffentlichte Version. Analyse und Umsetzungsvorschlag, keine bereits
umgesetzten Funktionen oder gemessene Überlegenheit.

## Entscheidung

Shredder ist ein direkter Wettbewerber für die soziale Planung; Slopes ist die
Messlatte für den aufgezeichneten Skitag. Unser aussichtsreichster Ansatz ist
eine verlässliche Kette von **passende Crew finden → Fahrt verbindlich planen →
am Berg wieder zusammenfinden → den Tag zuverlässig aufzeichnen**.

„Social + Carpool + Tracking“ reicht als Differenzierung nicht. Die bessere
Ausführung muss sichtbar und messbar sein: weniger Abstimmung, mehr tatsächlich
zustande gekommene Tage, zuverlässige Aufnahmen und ehrliche Messwerte.

Der bestehende Produktkern bleibt sinnvoll. Tracking ist aber eine Erweiterung
gegenüber PRODUCT.md, das einen Recorder ausdrücklich ausklammert. Dieses
Dokument beschreibt diese neue Option, ohne bestehende Produktentscheidungen
oder Standortgrenzen stillschweigend zu ändern.

## Evidenz und Grenzen

- **Lokal geprüft:** Produkttexte, UI-/Datenzugriffsgrenzen, Standort-Schemas,
  Serveraktionen und Datenmodell. Vorhandene lokale Änderungen wurden mitgelesen.
- **Extern belegt:** offizielle Websites, Store-Beschreibungen und Supportartikel.
  Eine beschriebene Funktion ist kein Nachweis ihrer Qualität im Alltag.
- **Hypothesen:** Chancen und vorgeschlagene Verbesserungen sind entsprechend
  als Vorschlag formuliert. Keine Konkurrenz-App wurde hier auf der Piste getestet.
- **Nicht belegt:** vergleichbare GPS-Fehler, Akkutests unter identischen Bedingungen,
  Algorithmusdetails von Slopes/Shredder, Matching-Erfolgsraten oder aktive Nutzer
  in Innsbruck. Keine erfundenen Genauigkeitsprozente oder Erfolgsquoten.

Shredder unter tryshredder.com und „Shredd“ unter shredd.org sind verschiedene
Produkte. Hauptvergleich ist das vom Nutzer genannte Shredder; Shredd wird unten
als zusätzlicher technischer Wettbewerber berücksichtigt.

## Was die anderen gut machen

### Slopes

Slopes bietet Tracking, Statistiken und Freunde-Funktionen. Premium erweitert
das um Detailwerte pro Abfahrt, Offline-Karten, Geschwindigkeitskarten, 3D und
Abfahrtsvergleiche. Die offizielle Premiumseite nennt aktuell 34,99 US-Dollar
pro Jahr; regionale Preise können abweichen. Diese Basis ist schon umfangreich:
eine einfache Statistikseite wäre kein überzeugender Wechselgrund.
[Offizieller Funktions- und Preisvergleich](https://getslopes.com/premium).

Aufnahme ohne Mobilfunk und lokale Auswertung sind dokumentiert. Slopes erklärt
auch die Grenzen des GPS-Empfangs und Geräteunterschiede. Das sind Vorbilder für
eine App, die mit dem Telefon in der Tasche funktionieren soll.
[Offline-Aufnahme](https://slopes.helpscoutdocs.com/article/8-work-without-an-internet-connection),
[GPS-Hinweise](https://slopes.helpscoutdocs.com/article/7-gps-tips).

Slopes hat außerdem einen Trip Planner mit Terminen, Gebieten, Einladungen und
Standortfreigabe während gemeinsamer Trips. Auch das Filtern kurzer GPS-Spitzen
bei der Höchstgeschwindigkeit ist dokumentiert. Weder Gruppenplanung noch
einfache Ausreißerfilter wären deshalb eigenständige Neuerungen.
[Trip Planner](https://blog.getslopes.com/slopes-pro-tip-trip-planning/),
[Messung der Höchstgeschwindigkeit](https://blog.getslopes.com/20-tips-tricks-to-make-the-most-out-of-slopes/).

**Folgerung:** Unser vorgeschlagener Planungsvorteil muss über einen Trip mit
Einladungen hinausgehen: bedingte Fahrtwünsche und ausdrücklich bestätigte
Mitfahrplätze. Gute Karten und Aufnahmequalität werden Voraussetzungen,
sobald wir Tracking anbieten.

### Shredder

Shredder bewirbt passende Mitfahrer, Tracking, Community, Events und Mitfahrten.
Die Android-Beschreibung zeigt deshalb eine erhebliche Überschneidung mit unserem
Ansatz. Die iOS-Beschreibung umfasst mittlerweile auch andere Action-Sportarten.
[Google Play](https://play.google.com/store/apps/details?id=com.tryshredderapp.android),
[App Store](https://apps.apple.com/us/app/shredder-ski-snowboard/id6749258218).

Die Website verspricht freie Nutzung ohne Schranken für Kontakte und Aufnahme.
Store-Einträge führen weiterhin In-App-Käufe; einzelne Bewertungen berichten von
früheren Paywalls und Fehlern. Das kann einen geänderten Geschäftsansatz oder
unterschiedliche Versionen widerspiegeln. Der tatsächliche aktuelle Kaufablauf
muss in der App überprüft werden. Bewertungen sind Hinweise für Tests, keine
repräsentative Qualitätsmessung.
[Shredder-Website](https://www.tryshredder.com/),
[Store-Eintrag mit Bewertungen und Käufen](https://apps.apple.com/us/app/shredder-ski-snowboard/id6749258218).

**Folgerung:** Keine Strategie auf „Shredder kostet, wir sind gratis“ aufbauen.
Die bessere Gelegenheit ist eine klare, verbindliche Gruppenplanung statt eines
Kontakts, der erst wieder in anderen Chats organisiert werden muss. Das ist eine
zu überprüfende Produktthese, keine belegte Konkurrenzschwäche.

### Shredd als technischer Frühindikator

Shredd bewirbt Trail-Matching mit Konfidenz, Offline-Zwischenspeicherung,
zeitbegrenzte Standortfreigaben und Integrationen. Die Website zeigt einen
TestFlight-/Buildathon-Kontext. Diese Angaben beweisen weder Produktionsreife
noch Genauigkeit, zeigen aber: Auch solche technischen Ideen sind bereits im Markt.
[Shredd](https://shredd.org/).

## Wo wir heute stehen

| Bereich | Wettbewerbsmaßstab | Pistl heute | Konsequenz |
| --- | --- | --- | --- |
| Tagesplanung | Shredder: Kontakte, Events, Mitfahrten; Slopes: Trip Planner | Crew-/Ride-Konzept; Produktoberflächen teils Beispieldaten | Echte Zusagen und Plätze zuerst vollständig verbinden |
| Passende Gruppe | Shredder: Skill-Matching beworben | Profile und Freundesgraph als Grundlage | Tagesabsicht, Terrain, Zeitfenster und Mitfahrt erklären |
| Aufzeichnung | Slopes: Aufnahme ohne Netz, Auswertung pro Abfahrt | Kein Ski-Recorder gefunden | Eigene Recorder-Domäne und native Aufnahme nötig |
| Standortfreigabe | Slopes: Freunde; Shredd: zeitbegrenzte Freigaben beworben | Lokale Vordergrund-Verträge, noch keine vollständige Geräteaufnahme | Datenalter, Unsicherheit und Ablauf sichtbar machen |
| Karten | Slopes: interaktive und Offline-Karten | Leaflet-/Resort-Prototyp und statische Gebietsangaben | Datenqualität und Aktualität vor 3D priorisieren |
| Privatheit | Konkurrenz hat ebenfalls Schutz-/Freigabefunktionen | Enger Freundesgraph, zusätzliche Minderjährigen-Grenzen | Potenzielle Stärke, erst durchgängige Umsetzung beweist sie |

Reale Auth-/Profilgrundlagen existieren. README trennt sie von lokalen, noch
nicht vollständig bereitgestellten Social-/Standortverträgen. Ein vorhandener
Server-Endpunkt ist keine fertige Nutzerfunktion.

Besonders relevant:

- `app/(app)/feed/page.tsx` nutzt Fixtures und lokale UI-Zustände.
- `features/location/actions.ts` setzt Standortaktionen explizit auf Vordergrund.
- `features/location/schema.ts` akzeptiert Positionsunsicherheiten bis 1.000 m.
  Das ist eine Eingabegrenze, keine behauptete Tracking-Genauigkeit.
- `supabase/migrations/20260803160000_location.sql` speichert einen ersetzbaren
  Livepunkt je Session, keine Abfahrtsserie.
- `docs/PRODUCT_BRIEF.md` beschreibt bereits bedingte Fahrtwünsche („Pistl Go“).
  Diese bestehende Idee ist konkreter als eine weitere allgemeine Matching-Seite.

**Unsere heutigen Vorteile sind überwiegend Produktfokus und Architekturansatz,
noch keine nachgewiesene Überlegenheit im realen Betrieb.**

## Übernehmen und besser ausführen

| Bewährtes Prinzip | Unsere bessere Ausführung als Vorschlag | Erfolgsmaß |
| --- | --- | --- |
| Passende Fahrer entdecken | „Passt, weil gleicher Pass, Zeitfenster und bevorzugtes Terrain“; Selbstauskunft korrigierbar | Anteil bestätigter, tatsächlich gemeinsamer Tage |
| Events und Mitfahrten | Bedingungen zusammenbringen; Fahrer und Mitfahrer bestätigen Plätze; Absagen aktualisieren den Plan | Planungsdauer, offene Plätze, Überbuchungen |
| Freunde auf Karte | „Vor 40 Sekunden, ungenau“ statt scheinbar aktueller Punkt; vereinbarter Lift/Treffpunkt als Alternative | Erfolgreiche Wiedervereinigung, Zeit bis Treffpunkt |
| Aufnahme starten und wegstecken | Ein Start, lokale Speicherung, klare Statusanzeige und sichtbare Unterbrechungen | Vollständige Sessions bei gesperrtem Bildschirm |
| Tagesstatistik und Replay | Gemeinsamer Tagesrückblick plus nachvollziehbare individuelle Messwerte | Wiederkehr, Nutzung und akzeptierte Korrekturen |
| Abfahrtsvergleich | Ähnliche Strecken und Bedingungen vergleichen; Messunsicherheit erhalten | Falsche Zuordnungen, Verständlichkeit |

Funktionale Prinzipien übernehmen; eigene Oberflächen, Texte, Daten und
Implementierung entwickeln. Karten-/Liftinformationen mit Herkunft,
Nutzungsrechten und Zeitstempel führen. Ein unbekannter Status darf nicht als
„offen“ dargestellt werden.

Bei Matching ist hohe Geschwindigkeit kein Beleg für Können. Geländepräferenz,
Komfort, Pausen, Gruppengröße und Tagesabsicht sind plausiblere erste Merkmale.
Gemessene Daten können später freiwillige Ergänzungen liefern. Ob das tatsächlich
besser vermittelt, muss mit echten Crews gemessen werden.

## Tracking: So entsteht ein belastbarer Qualitätsvorteil

Genauigkeit besteht aus mehreren Problemen: Position, Geschwindigkeit, Höhenmeter,
Abfahrts-/Lift-Erkennung und Vollständigkeit. Ein guter Wert in einer Kategorie
beweist nichts über die anderen. Dass zwei Apps ähnliche Summen zeigen, beweist
ebenfalls nicht deren Richtigkeit.

### 1. Aufnahme bei gesperrtem Bildschirm

Für den vorgeschlagenen Recorder eine native Aufnahmeschicht vorsehen, entweder
in einer nativen App oder mit geeigneten nativen Modulen. Eine Web-Hülle allein
liefert diesen Nachweis nicht. Apple dokumentiert spezielle Hintergrundmodi und
Location-Sessions; Android empfiehlt für fortlaufende Fitness-Aufnahme einen
Location-Foreground-Service. Berechtigungen, OS-Limits und Wiederanlauf müssen
auf echten Geräten geprüft werden.
[Apple](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background?changes=latest_maj_8__2&language=objc),
[Android](https://developer.android.com/develop/sensors-and-location/location/battery/scenarios).

Die aktuelle Liveort-API nicht zu einem Recorder umdeuten: Private Aufzeichnung
und geteilte Position brauchen eigene Zwecke und Freigaben. Eine Aufnahme darf
nicht automatisch den gesamten Track für Freunde sichtbar machen.

### 2. Messwerte mit Qualitätsinformationen behalten

Vorschlag: Zeit, Koordinaten, Positions-/Höhenunsicherheit, Höhe und, soweit
verfügbar, Geschwindigkeit samt Unsicherheit speichern. Fehlende oder ungültige
Werte bleiben fehlend. Rohdaten und abgeleitete Werte versionieren, sodass ein
Algorithmusupdate reproduzierbar geprüft werden kann.

Ausreißer über Zeitkonsistenz, Unsicherheit und Bewegungsplausibilität prüfen.
Sensor-Geschwindigkeit gegen Positionsänderung abgleichen, statt nur den Abstand
zweier fehlerhafter Punkte durch eine Sekunde zu teilen. Glättung muss an engen
Kurven getestet werden: Zu starke Filter verlieren Strecke und echte Spitzen.
Eine belastbare Spitzengeschwindigkeit braucht mehr als einen isolierten Punkt.

Die mathematische Gefahr ist real: Positionsfehler können aufsummierte
GPS-Distanzen systematisch vergrößern.
[Forschung zu GPS-Distanzfehlern](https://arxiv.org/abs/1504.04504).

### 3. Abfahrt, Lift, Pause und Transfer unterscheiden

Vorschlag: Zustand aus mehreren Signalen ableiten – Bewegungsrichtung,
Höhenentwicklung, Dauer und verifizierter Pisten-/Liftgeometrie. Ein einzelner
Höhensprung darf keine neue Abfahrt erzeugen. Lange Lücken bleiben als Lücken
sichtbar; Verbindungslinien erzeugen keine erfundene Geschwindigkeit.

Pisten-Matching braucht Konfidenz und einen „unbekannt“-Zustand. Nebenliegende
Pisten, Querungen und Off-piste-Fahrt dürfen nicht zwangsweise auf die nächste
Linie gezogen werden. Kartenfehler sind keine Sensorfehler und müssen gesondert
untersucht werden. Barometer und Höhenmodell sind Kandidaten zur Höhenkorrektur,
keine automatische Genauigkeitsgarantie.

### 4. Offline zuerst, Akku mitmessen

Punkte zunächst dauerhaft lokal sichern, Übertragung später wiederholbar und
ohne Duplikate. Netzverlust, Neustart, voller Speicher und App-Abbruch getrennt
testen. Ohne GPS-Empfang kann auch Offline-Speicherung keine Punkte erzeugen.

Aufnahmefrequenz und Upload-Frequenz getrennt steuern; die Karte muss bei
gesperrtem Bildschirm nicht rendern. Adaptive Frequenzen auf echte Kurven- und
Segmentfehler prüfen, bevor sie zur Batteriesparfunktion werden.

Slopes nennt in einem Supportartikel durchschnittlich 7 % Akku pro Stunde in
eigenen Tests. Der Artikel ist von 2023 und kein aktueller Vergleichsbenchmark.
Unser Ziel muss auf denselben Geräten und unter denselben Bedingungen gemessen
werden, statt diese Zahl unkritisch zu übernehmen.
[Slopes-Akkuhinweise](https://slopes.helpscoutdocs.com/article/4-battery-life).

## Vergleichstest und vorgeschlagene Abnahmekriterien

Alle folgenden Zahlen sind **Entwicklungsziele**, keine heutigen Eigenschaften
und keine Messwerte der Konkurrenz.

Zuerst synthetische/reproduzierbare Aufnahmen: Stillstand mit GPS-Drift,
einzelner Sprung, doppelte Zeitstempel, lange Lücke, Lift, Serpentinen,
Netzverlust und Wiederanlauf. Danach ein Pilot mit mindestens 30 Skitagen über
mehrere Gebiete, ältere/neue iPhones und Android-Geräte. Der Pilot dient der
Kalibrierung; die benötigte Stichprobe für einen Überlegenheitsnachweis wird aus
Streuung und gewünschtem Effekt abgeleitet.

Gleiche Geräteklassen, vergleichbare Trageposition und zufälliger Gerätetausch
verhindern einen unfairen Hardwarevergleich. Gleichzeitige Apps können Energie
und OS-Verhalten beeinflussen: Akkumessungen getrennt und randomisiert durchführen.
Version, Hardware, Temperatur, Akku-Gesundheit und Netzbedingungen protokollieren.

| Metrik | Referenz und Auswertung | Vorgeschlagenes Ziel |
| --- | --- | --- |
| Aufnahmevollständigkeit | Beobachtete aktive Fahrzeit; Lücken gesondert ausweisen | Mindestens 99 % auf definierten Tests mit verfügbarem GPS; GPS-Ausfälle zusätzlich berichten |
| Abfahrts-/Lift-Erkennung | Unabhängig protokollierte Grenzen; Precision, Recall und Grenzzeitfehler | F1 mindestens 0,95 und besser als Konkurrenz im selben Datensatz |
| Geschwindigkeit | Validierte hochfrequente GNSS-Referenz; für kurze Abschnitte Lichtschranke/Radar | MAE höchstens 2 km/h in klar definierten Bedingungen; zusätzlich p95-Fehler |
| Distanz/Höhenmeter | Validierte Referenzspur; Referenzunsicherheit separat | Median relativer Fehler höchstens 3 % pro geeigneter Abfahrt; zusätzlich p95 |
| Falsche Geschwindigkeitsrekorde | Referenz und manuelle Prüfung auffälliger Spitzen | Keine unbelegten Spitzen in den Abnahmeszenarien |
| Offline-Datenverlust | Bekannte gespeicherte Punktfolge, Netz-/Neustarttests | Kein Verlust bereits dauerhaft gespeicherter Punkte; keine Duplikate |
| Energiebedarf | Gepaarte Tests bei ähnlicher Temperatur, Bildschirm aus | Weniger Zusatzverbrauch als Slopes bei mindestens gleicher Aufnahmequalität |
| Standortaktualität | Zeit zwischen Erfassung und Anzeige, nur bei Netz | p95 unter 15 Sekunden; ältere Positionen sichtbar als veraltet |

GNSS-Referenz im Wald oder an Felswänden nicht blind als Wahrheit behandeln.
Referenzqualität prüfen und nicht auswertbare Abschnitte transparent berichten.
2D-/3D-Distanz und Definition der Abfahrt vorher vereinheitlichen. Beim Akku
sowohl absoluten Tagesverbrauch als auch Zusatzverbrauch gegenüber einer
vergleichbaren Baseline zeigen.

Ergebnis pro Gerät, Gelände und Empfangsbedingung berichten; Mittelwerte allein
verstecken problematische Tage. „Deutlich besser“ als vorab definierte
Entscheidungsregel: beispielsweise mindestens 20 % weniger Geschwindigkeitsfehler
bei gleichem oder geringerem Energiebedarf und ohne schlechtere Vollständigkeit.
Dieses relative Ziel gilt nur für einen belastbaren, ausreichend großen Vergleich;
bei ohnehin sehr kleinen Fehlern zählt zusätzlich der praktische Unterschied.

## Reihenfolge der Umsetzung

1. **Nutzbare Crew-Kette:** Fixtures durch vorhandene Serververträge ersetzen;
   Zusagen, Sitzplätze, Absagen und Kommunikation durchgängig prüfen.
   Erfolg: mehrere Testkonten sehen dauerhaft denselben verbindlichen Plan.
2. **Pistl Go:** Kleinste Version der bestehenden bedingten Fahrtwünsche;
   Erklärungen, Bestätigung und Ablauf statt undurchsichtiger Matching-Score.
   Erfolg: weniger Abstimmung bis zu einem tatsächlich stattfindenden Tag.
3. **Recorder-Prototyp parallel zum Produktkern:** Architekturentscheidung für
   native Aufnahme, lokale Speicherung und Messdatenformat; zunächst ohne 3D.
   Erfolg: kompletter Tag mit Sperrbildschirm und ohne Mobilfunk reproduzierbar.
4. **Fehlerfilter und Segmentierung:** Replays, Referenztests, Höhen-/Tempoqualität,
   ehrliche Unsicherheitsanzeige. Erfolg: vorgeschlagene Abnahmekriterien.
5. **Crew am Berg:** Verifizierte Treffpunkte, zeitbegrenzte Freigabe,
   verständliche Aktualität; gemeinsame Tagesrückblicke. Erfolg: bessere Treffen.
6. **Erst nach Qualitätsnachweis:** Watch, 3D-Replay, weitergehende Empfehlungen,
   Integrationen und Premium-Komfort. Keine belastbare Termin-/Kostenschätzung,
   bevor native Plattformwahl und Messpilot geklärt sind.

Produktmetriken: Zeit von Wunsch bis bestätigtem Plan, erfüllte Fahrtwünsche,
tatsächlich gemeinsame Tage, Wiederholung über mehrere Wochen und Unterstützungs-
aufwand. Messung mit freiwilliger Rückmeldung und notwendigen Produktdaten;
keine permanente Standortüberwachung als Erfolgsnachweis.

Die lokale Dichte rund um wenige Gebiete ist eine mögliche Stärke gegenüber
einem breiten Action-Sport-Netzwerk. Sie entsteht erst durch aktive Crews und
wiederholte Nutzung. Für bestehende Slopes-Nutzer darf Pistl anfangs als
Planungswerkzeug ergänzend nützlich sein; ein Wechsel des Recorders braucht
nachgewiesene Qualität und später einen guten Datenimport.

**Nächste konkrete technische Lieferung:** Ein Plan, der mit zwei echten Konten
inklusive Mitfahrbestätigung dauerhaft funktioniert, und daneben ein minimaler
nativer Recorder mit exportierbaren Testspuren. Damit prüfen wir sowohl unseren
Produktvorteil als auch die technische Voraussetzung für besseren Trackingbetrieb.
