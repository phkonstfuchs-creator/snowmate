# Pistl: Umbau für einen gemeinsamen Skitag

- **Status:** Gesamtumbau geplant; Phase A am 2026-10-09 vom Nutzer gestartet und als isolierte Designvorschau umgesetzt. Private eigene Go-Skitage sind als erster produktiver Teil von Phase C umgesetzt; weitere Backend-/Native-Phasen bleiben offen.
- **Stand:** 2026-10-09, ausgehend von Production `e13dfe072db44bfa9ca82db2396f33ce5bd569fa`.
- **Auftrag:** Größerer Umbau ausdrücklich erlaubt. Pistl Go bleibt der Name; dauerhafte freiwillige Standortfreigabe für Freunde ist gewünscht.
- **Planung:** Zwei gezielte GPT-6-Luna-Aufträge, Produktplanung und technische Bestandsprüfung. Keine Anbieter gebucht oder Nutzer kontaktiert.
- **Grundlage:** [Mountain UX Audit](../qa/MOUNTAIN_UX_AUDIT.md), [Usability-Protokoll](../qa/USABILITY_PROTOCOL.md), [Go](pistl-go.md), [Standort](live-location.md), [Lift-Treffpunkt](lift-meetup.md), [Tracking](ski-day-tracking.md), [Karte und Konditionen](ski-map-and-conditions.md).

## 1. Ziel und erhaltene Anforderungen

Pistl soll einem jungen Rider ermöglichen, einen Skitag mit seiner Crew zu starten, passende Bedingungen und konkrete Pisten zu verstehen und Freunde am Berg wiederzutreffen. Der Zusammenhang zwischen diesen Aufgaben bestimmt den Umbau. Die vorhandenen Funktionen bleiben erreichbar und werden gegen die öffentlich dokumentierten Slopes-/Shredder-Funktionen geprüft.

Lena, 16: „Wer fährt, komme ich hin, welche Runde passt und wo treffen wir uns?“ Jonas, 15: gleiche Planung, manuelle Treffpunktvereinbarung und Chat; bestehende Altersgrenzen für Standort-/Liftstatus bleiben bestehen. Amir, 22: ohne vorhandene Crew muss er trotzdem einen ersten Plan erstellen und passende Rider finden können. Diese Personas sind Arbeitshypothesen; bisher gab es keine Interviews mit echten Jugendlichen.

| ID | Ziel aus dem bisherigen Auftrag | Verankerung im Umbau |
|---|---|---|
| Z1 | Jugendliche Skifahrer als Hauptprofil | Kurze Wege, ein Daumen, große Ziele, Fahrniveau getrennt vom Stil; Tests mit 15/16/17 Jahren |
| Z2 | Nahtlos planen, Konditionen und konkrete Pisten verstehen | Go führt zu Termin, Gebiet, Wetter, Piste und Transport; Berg zeigt dieselben Referenzen |
| Z3 | Freunde treffen, sofort sichtbar | Crew-Leiste auf Heute und Berg; vereinbarter Treffpunkt mit Zusagen |
| Z4 | Dauerhafte Standortfreigabe, später Widgets | Gespeicherter Modus bis zum Ausschalten; native Hintergrundfunktion und verständliche Zustände |
| Z5 | Karte wie die gezeigten Slopes-/Bergfex-Referenzen | Große Kartenfläche, klar gezeichnete Pisten/Lifte, auswählbare Objekte, Gelände, 2D/3D |
| Z6 | Alle Lifte und glaubwürdige Zeiten | Inventar je Gebiet, Quellabgleich, Fahrzeit getrennt von Wartezeit und Weg zum Treffpunkt |
| Z7 | Sofort verständliche Features; kein störendes Laden/Scrollen | Primäraktion pro Zustand; kein ungefragtes Start-Sheet; Lade-/Offlinezustände; 320/390px-Prüfung |
| Z8 | Echte Swipes und Twitter/X-inspirierte Bedienung | Crew-Tabs per Tippen und Wischen, Auswahl merken, vertikales Lesen; zugängliche Tasten behalten |
| Z9 | Besseres Tracking nachweisen | Gemeinsame Vergleichsmessung von Position, Ausreißern, Segmenten und Akku |
| Z10 | Konkurrenzfunktionen plus neue Vorteile | Alle 18 Fähigkeitsgruppen im Audit bleiben im Backlog; eigene Crew-Abläufe zuerst validieren |
| Z11 | Gebiet vor Empfangsverlust herunterladen | Sichtbares Gebietspaket mit Größe, Downloadzustand und Offline-Abnahme |
| Z12 | Heute gefahrene Strecken mit eigenem Avatar nachverfolgen | Kartenmodus „Mein Tag“, Tagesübersicht, Abfahrtswahl, Zeitlinie und Replay in der ersten Karten-Ausbaustufe |
| Z13 | Webcams checken | Direkter Zugang bei Gebiet/Konditionen/Go, Kamerastandort und Aufnahmezeit, Betreiberquelle |

Die fünf neuen Fotos sind Gestaltungsreferenzen. Foto 1 belegt den nutzlosen Go-Einstieg ohne passende Ausfahrt. Fotos 2–4 zeigen die gewünschte Kartenhierarchie. Die Zugfahrt in Foto 5 belegt keine Genauigkeit beim Skifahren und keine korrekte Abfahrts-/Lift-Erkennung.

Ergänzung durch zwei weitere Fotos: Offlinekarten werden vor dem Empfangsverlust heruntergeladen. Eine eigene Tagesroute lässt sich auf der Karte mit Avatar, Zeitlinie und Wiedergabe verfolgen. Diese beiden Abläufe und Webcams werden ausdrücklich in den frühen Kartenumfang aufgenommen.

## 2. Neue Struktur und sichtbare Abläufe

Vorschlag für vier Hauptbereiche: **Heute · Berg · Crew · Ich**. Bestehende Routen erhalten Weiterleitungen oder bleiben über passende Unterbereiche erreichbar. „Entdecken“ liegt unter Crew, Tracking direkt auf Berg und im Profil. Die dauerhafte Navigation bleibt kurz und behält Auswahl/Scrollposition.

| Fläche | Was sofort sichtbar sein soll | Direkte Aktion |
|---|---|---|
| Heute | Wer fährt, eigener nächster Plan, gemeinsamer Treffpunkt | Pistl Go starten / Plan fortsetzen |
| Berg | Große Karte, „Karte / Mein Tag“, Freunde, nächster Treffpunkt | Piste/Lift suchen, Tagesroute wiedergeben, Webcam ansehen, Treffen vereinbaren |
| Crew | Meine Crew / Entdecken als echte wischbare Tabs | Einladen, passenden Rider finden, Chat öffnen |
| Ich | Fahrniveau, Fahrstil, Heimatgebiet, nächste Tage, Einstellungen | Profil ändern, Standortmodus ändern, Skitage ansehen |

Die große Stadtumschaltung wird durch eine kompakte Gebietsauswahl ersetzt; regionale Filter bleiben bei Suche/Entdecken. Auf Berg füllt die Karte den verfügbaren Bereich zwischen Kopf und Navigation. Unten liegt eine aufziehbare Detailleiste. Attribution, eigener Standort und Stopp sind immer erreichbar. Wenige Kartenwerkzeuge: Suche, eigener Standort, 2D/3D. Es gibt kein Start-Popup, das erst geschlossen werden muss.

### Kartenmodus „Mein Tag“

Die gut sichtbare Auswahl **„Karte / Mein Tag“** wechselt die Darstellung derselben Bergkarte. „Mein Tag“ zeigt die bereits aufgezeichneten heutigen Strecken und die Tageswerte; An-/Ausschalten des Modus startet oder beendet weder Aufzeichnung noch Standortfreigabe. Ohne Tagesdaten erscheint „Noch nichts aufgezeichnet“ mit der bewussten Aktion „Aufzeichnung starten“.

Die eigene Strecke hat Anfang/Ende, ausgewählte Abfahrt oder ganzen Tag, einen eigenen Avatar am Wiedergabezeitpunkt und eine verschiebbare Zeitlinie. Play/Pause, Zurück-zum-Start und 1×/2×/4× sind direkt erreichbar. Während des Scrubbens zeigen Karte und Zahlen denselben Zeitpunkt. 2D und 3D funktionieren unabhängig vom Modus. Keine automatische Wiedergabe beim Öffnen.

Replay wird deutlich als **„Wiedergabe · 10:32“** gekennzeichnet. Live-Freundepositionen werden dabei ausgeblendet oder klar getrennt; ein historischer Avatar darf nicht als aktuelle Anwesenheit erscheinen. „Wiedergabe pausieren“ ist eine andere Aktion als „Aufzeichnung pausieren/beenden“. Laufende Aufzeichnung bleibt beim Replay aktiv. Buttons/Zeitleiste sind auch ohne Drag bedienbar, Reduced Motion bleibt respektiert.

Eine optionale Geschwindigkeitsfärbung nutzt nur brauchbare Messwerte und hat eine eigene Legende, getrennt von der Pisten-Schwierigkeit. Unbekannte Werte bleiben neutral. Messlücken und Pausen werden sichtbar unterbrochen; keine erfundene Strecke quer durch den Berg oder Avatarfahrt durch fehlende GPS-Daten. Automatisch erkannte Abfahrten/Lifte bleiben vor der Feldvalidierung als solche gekennzeichnet.

**Neue Datengrundlage:** Der bisherige Tracker speichert ausgedünnte `[lng, lat]`-Punkte ohne Zeitlinie und löscht die Route beim Abschluss; auf dem Server liegen nur Summen. Das Replay braucht private Zeitpunkte mit Position, Messzeit, Genauigkeit, optional Höhe/Geschwindigkeit und Segment-/Lückenmarkern. Ausdünnung muss diese Zusammenhänge erhalten. Für den ersten Umfang bleibt der heutige Track kontogebunden auf diesem Gerät, während der Aufzeichnung und bis 24 Stunden nach Abschluss; manuelles Löschen und Abmelden entfernen ihn. Der Beginn der Aufzeichnung erklärt diese lokale Aufbewahrung. Erst eine separate ausdrückliche spätere Wahl darf Cloud-Archiv/Teilen hinzufügen. Aus Freundesfreigabe entsteht niemals automatisch ein privates Trackingarchiv. Ältere nur zusammengefasste Skitage erhalten kein erfundenes Replay.

Karten-Pan, vertikales Feed-Scrollen, horizontale Crew-Tabs und Rider-Karten-Swipe bekommen getrennte Gestenflächen. Tasten bleiben als gleichwertige Bedienung erhalten. Kurze Texte und Fahrniveau helfen beim Verstehen; Geburtstage, Schule und genaue öffentliche Altersangaben gehören nicht ins sichtbare Jugendprofil.

### Pistl Go: eine echte Aktion auch bei null Ausfahrten

Pistl Go wird der Einstieg in einen gemeinsamen Skitag. Der erklärende Untertitel beschreibt die Aktion, statt den Markennamen zu ersetzen.

1. **„Skitag planen“:** Tag, Skigebiet und grobes Zeitfenster wählen. Bedingungen und Karte desselben Gebiets stehen direkt daneben. Ein eigener Entwurf ist möglich, ohne vorhandene Ausfahrt, Freunde oder GPS.
2. **„Mit wem und wie?“:** Freunde ausdrücklich einladen; Transport anbieten, Sitzplatz anfragen oder ohne Mitfahrwunsch planen. Gruppen- und Sitzplatzbedingungen bleiben privat, solange der Besitzer sie nicht ausdrücklich als neue gemeinsame Planinformation teilt.
3. **„Wo treffen wir uns?“:** Bekannte Station/Piste oder manuell beschriebener Treffpunkt plus Uhrzeit; der Plan bleibt auch ohne Standortfreigabe nutzbar.
4. **Weiterarbeit:** Gespeicherter Plan zeigt nächste Handlung: Freunde einladen, Sitzplatz anfragen, Zusage prüfen oder bewusst beitreten. Leerer Zustand bietet diese Erstellung als Hauptaktion, nicht nur Verweise auf andere Seiten.

„Vorhandener Ausfahrt anschließen“ bleibt ein zweiter Einstieg. Bestehende private Go-Wünsche, Mindestgruppe 2–12 inklusive Besitzer, bestätigter Sitzplatz und erneute Serverprüfung vor Beitritt bleiben erhalten. Ein Wunsch reserviert nichts. Keine automatische Teilnahme, Buchung oder Zahlung; keine Veröffentlichung eines privaten Wunsches durch die Migration.

Neue Entwürfe sind privat. Erst „Mit Crew teilen“ veröffentlicht ausdrücklich die freigegebenen Planinformationen im definierten Kreis. Für eine Umsetzung wird die neue Planaudience separat modelliert; ein kosmetischer Tab erweitert keine bestehende Sichtbarkeit. Bestehende öffentliche Events bleiben ein eigener Weg unter den vorhandenen Alters-/Hosting-Regeln.

### Drei eigene Ideen mit konkretem Nutzen

- **Nächste gemeinsame Runde:** Lift/Station, Uhrzeit und Zusagen in einer gemeinsamen Karte. „Bin dabei“ bestätigt Teilnahme. Aktuelle Ortsmeldungen wie „Warte oben“/„Bin da“ folgen den bestehenden Standort-Altersregeln und werden ausdrücklich gesendet.
- **Getrennt fahren, gemeinsam treffen:** Unterschiedliche Fahrniveaus wählen verschiedene bekannte Runden und denselben späteren Treffpunkt. Zunächst manuelle Auswahl; automatische Wege erst mit geprüftem Pistennetz und Statusdaten.
- **Crew-Leiste für den ganzen Skitag:** „Mia · zuletzt vor 35 s“ und vereinbartes Ziel auf Heute, Berg und später im Widget. Keine Standortfreigabe nötig, um den vereinbarten Plan weiterzulesen. Stale Daten behaupten keine aktuelle Anwesenheit.

## 3. Karte, Liftabdeckung und Datenqualität

**Ist:** MapLibre/OpenFreeMap-Vektorgrundkarte, OpenSnowMap-Pisten als Rasterbild, Höhen-Schummerung, keine auswählbare Pistengeometrie. `lib/lifts.ts` enthält 61 Datensätze unter 20 Gebietsnamen; das ist kein Vollständigkeitsnachweis. Nordkette hat drei Einträge im Code, die [Betreiberliste](https://nordkette.com/en/lifts-slopes/) nennt sechs Anlagen. Unterschiedliche Namen und Abschnitte müssen vor einem genauen Fehlbestandsbericht zugeordnet werden. Stubai hat im jetzigen Ausschnitt vier Lifte.

**Entscheidungsvorschlag:** MapLibre zunächst behalten. Echte 3D-Geländedarstellung ist damit möglich; ein anderer Renderer allein liefert keine besseren Pistendaten. [MapLibre: 3D Terrain](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/)

Benötigt wird eine versionierte Datenbasis für Gebiet, Station, Lift und Piste: stabile ID, vollständige Geometrie, Nummer/Name, Typ, Schwierigkeit, Richtung/Verbindungen, Ursprung und Stand. OSM kann Geometrie liefern; Betreiberreferenzen dienen dem Abgleich. Identität und Öffnungsstatus sind getrennte Daten. Modelle liefern Wetter, nicht den Beweis einer offenen Piste.

Die Importstrecke läuft außerhalb der normalen App-Bedienung. Nutzer warten nicht auf eine öffentliche Overpass-Abfrage. Geprüfte regionale Daten werden als Vektorlayer ausgeliefert; für den Piloten genügt gegebenenfalls GeoJSON, später gekachelte/gepackte Daten nach Größenmessung. Das Produktionsformat wird durch den technischen Datenversuch bestimmt.

Pro Gebiet braucht es eine Abdeckungstabelle: offizielle Inventarliste, jede zugeordnete Anlage/Piste, fehlende Geometrien, doppelte Abschnitte, Stationszuordnung, Statusquelle, Rechte und Prüfdatum. Förderbänder, Schlepplifte und Teilsektionen gehören dazu. „Vollständig“ gilt erst bei 100 % der zum datierten Betreiberinventar gehörenden Anlagen, ohne ungeklärte Zuordnung. Fehlende Geometrie wird gemeldet und geprüft, nicht gezeichnet, als sei sie bekannt.

**Pilotvorschlag:** Nordkette und Stubaier Gletscher für kleine und größere Netze. Anschließend derselbe Import-/Abgleichprozess für alle bestehenden Pistl-Gebiete; der Pilot reduziert nicht den endgültigen Umfang. Andere Gebiete bleiben erreichbar, mit ehrlichem Datenstand.

Angetippte Piste: Nummer/Name, Schwierigkeit, Verlauf, vorhandener Status, Quelle/Zeit, „Als Runde merken“ oder „Treffpunkt planen“. Angetippter Lift: Stationen, Betriebsstatus, belegte/geschätzte Fahrzeit und Treffpunkt. Unbekannt, veraltet und geschlossen bleiben unterschiedliche Zustände; unbekannt wird nie als offen ausgegeben.

Offline-Paket: Geometrien, berechtigter Kartenuntergrund, Stationen, vereinbarter Treffpunkt und Zeit des letzten Status. Zuerst Rechte und verfügbare Daten prüfen. Die OSMF-Regel für `tile.openstreetmap.org` erlaubt keine Offline-Massendownloads; andere aktuelle Provider haben eigene Bedingungen. [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)

### Gebiet vor dem Skitag herunterladen

**„Gebiet offline speichern“** steht beim Gebiet und im Go-Plan, nicht nur in Einstellungen. Vorher: Paketinhalt, erwartete Größe, verfügbarer Speicher und Stand. Währenddessen: Fortschritt, Abbrechen und Fortsetzen. Nachher: „Offline verfügbar“, Prüfsumme/Version, Aktualisieren und Löschen. Erst ein vollständig geprüftes Paket wird als verfügbar angezeigt; ein gescheiterter Download ersetzt kein funktionierendes altes Paket.

Paketumfang: Karte, Pisten/Lifte/Stationen, Gelände soweit lizenziert, der vereinbarte Treffpunkt und eigene lokal verfügbare Tagesdaten. Keine fremden Standortverläufe im öffentlichen Gebietspaket. Offline bleiben Karte, eigenes Geräte-GPS soweit verfügbar, lokale Aufzeichnung/Replay und der bekannte Treffpunkt nutzbar. Betriebsstatus ist ausdrücklich ein alter Stand; Freunde sind „zuletzt gesehen“, ohne neue Live-Behauptung. Ein Downloadzustand wird mit Flugmodus, App-Neustart, wenig Speicher und abgebrochenem Download auf Geräten geprüft. Web-/Native-Speichergrenzen und mögliche Cache-Löschung sind eigene Fälle.

### Webcams direkt bei der Entscheidung

Beim gewählten Gebiet und neben den Konditionen gibt es **„Webcams“**, zusätzlich im Go-Schritt „Gebiet wählen“ und als optionalen Kartenlayer. Eine Kamera zeigt Name, bekannten Standort/Höhe, Betreiber, verfügbaren Aufnahmezeitpunkt und Art: Standbild, Panorama oder Stream. Fehlt die verlässliche Kameraposition, bleibt sie in der Liste statt eines erfundenen Pins.

Tap öffnet eine große Ansicht mit bewusst gestarteter Wiedergabe, Kamerawechsel und „Auf Karte ansehen“, wenn die Zuordnung bekannt ist. Kein Autoplay aller Kameras. Ein fehlender Aufnahmezeitpunkt wird als unbekannt gezeigt; Abrufzeit ist nicht Aufnahmezeit. Alte Bilder/Ausfälle bekommen einen klaren Zustand und die offizielle Quelle. Ein Webcam-Bild wird nicht als Beweis einer offenen oder sicheren Piste verwendet.

Für den Pilot sind offizielle Quellen auffindbar: [Nordkette-Webcams](https://nordkette.com/en/cams/) sowie [Stubaier-Gletscher-Webcams](https://www.stubaier-gletscher.com/stubai-live/webcams/). Vor Einbettung Rechte, technische Schnittstelle, CSP und etwaige externe Player-/Cookie-Anforderungen prüfen; bis dahin funktioniert der bewusste Link zur Betreiberkamera. Bilder werden nicht ohne Erlaubnis gespiegelt. Optional zwischengespeicherte Bilder tragen ihren alten Aufnahme-/Speicherstand, nie „Live“ ohne aktuelle Evidenz.

## 4. Liftzeiten: drei getrennte Größen

Die jetzige Rechnung addiert statische Fahrdauer und pauschale Wartezeit. Die Annäherung verwendet Luftlinie. Damit lässt sich weder die echte Schlange noch ein erreichbarer Bergweg nachweisen.

| Größe | Neue Behandlung |
|---|---|
| Fahrt von Tal- zu Bergstation | Betreiberangabe priorisieren, Quelle/Stand zeigen; OSM-Wert als OSM-Wert behandeln; abgeleitete Länge/Geschwindigkeit als Schätzung |
| Warten und nächste Abfahrt | Nur belegter Fahrplan oder aktuelle Messung; sonst „Wartezeit unbekannt“ statt einer scheinbar gemessenen Minutenzahl |
| Ankunft beim vereinbarten Treffpunkt | Boarding-Zeit, Restfahrt, zulässiger Anschlussweg, Datenalter und Unsicherheit getrennt; ohne Grundlage keine präzise ETA |

OSM `aerialway:duration` bezeichnet Fahrtdauer in Minuten, nicht die Warteschlange. [OSM-Dokumentation](https://wiki.openstreetmap.org/wiki/Key:aerialway:duration). Die Nordkette nennt regulär 15-minütige Abfahrten und abweichenden Betrieb bei hohem Andrang; daraus folgt keine individuelle Wartezeit. [Betreiber-Fahrplan](https://nordkette.com/anlagen-fahrplan/)

Nutzerzustände müssen unterscheiden: „Warte am Lift“, „Sitze im Lift“, „Oben angekommen“. Wer das Boarding bestätigt, bekommt nicht nochmals die angenommene Wartezeit addiert. Nähe zu einer Talstation ist kein Boarding-Nachweis. Automatische Erkennung braucht mehrere frische passende Messpunkte und eine Rückfrage bei parallelen/mehrdeutigen Liften.

Validierung: wiederholte Referenzfahrten je Lift/Abschnitt, tatsächliches Boarding/Ankommen notieren, Tages-/Betriebsschwankungen erfassen. Fahrdauer und ETA-Fehler getrennt berichten. Als erster Pilot-Gate mindestens fünf dokumentierte Fahrten je beworbenem Liftmodell, Medianfehler höchstens 60 s und P90 höchstens 120 s; das ist ein vorgeschlagenes Mindestkriterium, kein wissenschaftlicher Genauigkeitsnachweis. Größere Feldstichprobe und Unsicherheitskalibrierung folgen. Bei unzureichender Evidenz Quelle/Spanne oder „noch nicht verifiziert“ statt präziser Prognose.

## 5. Standort dauerhaft für Freunde

**Gewünschtes Verhalten:** Modus **„Dauerhaft für Freunde“**, einmal bewusst einschalten, bis zum Ausschalten gespeichert. Keine tägliche erneute Startpflicht. Die bisherigen 1/4/12-Stunden-Modi bleiben als Alternative. Keine Migration aktiviert dauerhafte Freigabe automatisch.

Beim Aktivieren nennt die App den Kreis: alle bestätigten, nicht blockierten Freunde, einschließlich später ausdrücklich bestätigter Freunde. Anzeige und Stopp sind auf Heute, Berg und in den Einstellungen erreichbar. Sharing bleibt unabhängig vom Tracking, Go und Lift-Start.

Eine gespeicherte Zustimmung ist getrennt vom tatsächlichen Laufzustand:

- aus;
- eingeschaltet, Berechtigung nötig;
- aktiv im Vordergrund / aktiv im Hintergrund;
- eingeschaltet, aber Empfang/OS unterbricht Updates;
- vom Nutzer pausiert;
- gestoppt.

„Dauerhaft“ bedeutet die fortbestehende Zustimmung, keine Garantie sekundengenauer Updates unter allen OS-Zuständen. Die native App muss Hintergrundmodus, Berechtigungen, Wiederaufnahme und Akkusparfälle auf echten Geräten prüfen. iOS kann bestimmte Hintergrundupdates/Neustarts erlauben, garantiert aber keinen ständig laufenden Prozess. [Apple Core Location](https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services). Android benötigt den passenden Standortdienst/Berechtigungsablauf; grobe Berechtigung bleibt auch im Hintergrund grob. [Android Hintergrundfreigabe](https://developer.android.com/develop/sensors-and-location/location/permissions/background), [Standortdienst](https://developer.android.com/develop/background-work/services/fgs/service-types)

Im Browser bleibt die Laufzeit begrenzt; geschlossene Seiten liefern keine versprochene Dauerfreigabe. Die Oberfläche zeigt diese Einschränkung. Native Umsetzung und Distribution sind daher Teil dieses Features, kein später optionaler Web-Feinschliff.

Technischer Vertrag: versionierte kontogebundene Freigabepräferenz plus kurzlebige Laufberechtigung, ein aktives veröffentlichendes Gerät, neu geprüfte Zustimmung bei Updates, nur letzte Position ohne dauerhaften Freundeverlauf. Alte Fixes dürfen die Berechtigung nicht unbegrenzt verlängern. Ausschalten sperrt Server-Lesezugriff sofort bei erreichbarem Server; lokaler Watcher stoppt sofort. Offline-Widerruf wird als ausstehend gezeigt, alte Daten verfallen spätestens mit ihrer definierten kurzen TTL. Blockieren, Entfreunden, Löschen und Abmelden entfernen Zugriff und Widgetdaten; Abmelden beendet die Freigabe. Bestehende Altersgrenze 16 bleibt serverseitig bestehen.

Die native App darf diese Laufberechtigung automatisch erneuern, auch nach einem vom OS erlaubten Wiederanlauf, wenn aktuelle Serverzustimmung, gültige Anmeldung, aktives Gerät und Berechtigungen erneut passen. Es ist kein neuer täglicher Nutzerstart erforderlich. Neue Daten müssen einen zulässig frischen Messzeitpunkt haben; ein alter zwischengespeicherter Fix erneuert keine sichtbare Frische. Nach Offlinezeit wird nur der jüngste brauchbare Fix veröffentlicht, kein nachträglicher Freundeverlauf. Kann das OS den Dienst nach Prozess-/Geräteneustart nicht fortsetzen, bleibt die Zustimmung erhalten, der Laufzustand wird aber als unterbrochen angezeigt; Wiederaufnahme beim nächsten zulässigen App-Start. Kein automatischer Berechtigungsdialog bei unbekannter/entzogener Systemfreigabe.

Adaptive Messung spart Akku im Stillstand, reagiert bei Bewegung und verbessert Datenrate im aktiven Treffen. Konkrete Intervalle/TTL werden im Geräteversuch bestimmt; zuerst mit Online-Frischeziel 60 s und konservativem Anzeigelimit planen. Alte oder ungenaue Fixes zeigen Zeit/Unsicherheit; keine Station/ETA aus unbrauchbaren Daten.

Widgets folgen demselben geprüften Vertrag: iOS Live Activity für den aktiven Tag, Android laufender Status plus Home-Widget, normale Home-Widgets ergänzend. Miniansicht: nächster Treffpunkt, zugesagte Crew, Zeit der letzten Aktualisierung, als Schätzung gekennzeichnete ETA. Namen auf dem Sperrbildschirm sind konfigurierbar. Es existieren noch keine Widget-Targets; Details und Plattformgrenzen stehen im [Audit](../qa/MOUNTAIN_UX_AUDIT.md#native-widget-contract-planned-not-implemented).

## 6. Architektur, Migration und Fehlerfälle

Neue Verträge: privater `DayPlan`, ausdrücklich geteilte Planinformationen/Teilnehmer, Treffpunkt mit stabiler Referenz und Zusagen, Freigabepräferenz/Laufberechtigung, versionierte Gebietsdaten und separate Status-/Zeitbelege. Der private `DayPlan` ist inzwischen umgesetzt; die übrigen neuen Verträge bleiben Entwurf.

Zusätzlich: versioniertes privates lokales Tagesarchiv für Replay, ein Gebietspaket-Manifest mit Integritäts-/Downloadzustand und ein gepflegtes Webcam-Verzeichnis mit Betreiberlink, Standortreferenz, Medientyp und Aktualitätsinformationen. Replay und laufende Aufzeichnung teilen die Zeitdaten, nicht eine gemeinsame Start-/Stoppaktion. Private Daten sind nicht Teil eines verteilten statischen Gebietspakets.

Alle nutzerbezogenen Reads/Writes bleiben sessiongebundene RPCs mit RLS, Eingabeprüfung, Rate-Limits und passenden Export-/Löschpfaden. Widerruf und Alters-/Blockregeln gelten auch für Realtime, Caches und Widgets. Push prüft Empfänger beim Versand; der Sperrbildschirm wird nicht ungefragt mit Standortdetails gefüllt.

Bestehende Go-Wünsche werden unverändert gelesen; neue unabhängige Pläne benötigen eine ergänzende Migration. Aktuelle zeitbegrenzte Shares bleiben zeitbegrenzt. Bestehende Lift-IDs werden durch eine Zuordnung migriert; laufende Status dürfen beim Datenimport nicht dem falschen Lift zugeordnet werden. Vor Einführung sind DB- und TypeScript-Zeitlogik auf einen gemeinsamen versionierten Datenvertrag auszurichten.

Bei Datenfehlern bleibt der letzte bekannte Plan mit Zeitangabe lesbar. Speichern/Einladen/Beitreten zeigt ausstehend oder fehlgeschlagen; offline keine fingierte Zusage. Retry verliert keine Eingaben. Es gibt keine automatische unbekannte Umleitung; alte App-Versionen erhalten kompatible bestehende RPCs. Jede neue Fläche hat einen getrennten Rollback, der gespeicherte Pläne nicht löscht.

## 7. Reihenfolge und überprüfbare Ergebnisse

| Phase | Konkretes Lieferergebnis | Gate vor nächstem Schritt |
|---|---|---|
| A — Ablauf und Datenversuch | Klickbarer Heute/Go/Berg/Crew-Prototyp; „Mein Tag“ mit Replay-Bedienung; Go ab null; Gebietsinventar und Quellen-/Rechte-/Kostenmatrix einschließlich Paketen/Webcams | 5-Sekunden-Bedeutungstest geplant; alle Kernabläufe anklickbar; mindestens ein echtes auswählbares Pilotnetz; kein ungeklärter Anbieter als Produktionsversprechen |
| B — Kartenfundament und eigener Tag | Geprüfte Pilot-Geometrie/Stationen, Such-/Auswahlkarte, 2D/3D, Tagesroute/Avatar-Replay mit echten eigenen Zeitdaten, erste Webcam-Zugänge, Offline-Pilotpaket soweit rechtegeklärt | 100 % zugeordnetes Anlageninventar im Pilot, geprüfte Stationen/Verbindungen; Replay ohne erfundene Lücken; Datenschutz/Retention und Offline-Integrität geprüft; keine erfundenen Statusdaten; mobile Perf-/Netzausfallprüfung |
| C — Nutzbares Go und Treffpunkt | Eigener privater Skitag ab null, ausdrückliches Teilen, bestehende Wünsche, Transport, Zusagen, nächste gemeinsame Runde | Neuer Nutzer schafft einen Plan ohne bestehende Ausfahrt/GPS; kein automatischer Beitritt; Minderjährigen-/Audience-/Kapazitätsregeln geprüft |
| D — Dauerfreigabe und Frische | Kontopräferenz, native Hintergrundlaufzeit, prominente Crew-Karte, Stopp/Widerruf/Offlinezustände | Physische iOS-/Android-Geräte: gesperrt, Neustart, Akku, Berechtigungsentzug, 15-min-Netzausfall, Logout und Block |
| E — Belastbare Zeiten und außerhalb der App | Validierte Liftzeiten/ETA-Spannen, Offlinepakete über den Pilot hinaus, Live Activity/Home-Widget | Je ETA-Modell Feldbeleg; alte Daten verlieren ETA; Widget-Widerruf/TTL und Paket-Rechte getestet |
| F — Konkurrenzumfang ausbauen | Trackingqualität, erweiterter Replay-/Saisonvergleich, Watch/Health, detaillierte Heatmap/Statistik, Clips, Jahresrückblick, GPX, offizielle Hinweise | Jede der 18 Audit-Gruppen bekommt eigenes Nutzerziel, Evidenz und Geräte-/Datenabnahme |

Kreative UX und Karten-Datenversuch laufen in A parallel. Go-Prototyp braucht keine fertige ETA. Produktive Go-Abläufe und Dauerfreigabe können nach ihren separaten Verträgen parallel zu Gebietsimporten umgesetzt werden. Es gibt keine feste Zeit-/Eurozusage, bevor Datenrechte, Hostingvolumen, native Builds und der Pilot gemessen sind.

## 8. Abnahme und Nachweis

Diese Werte sind Zielkriterien, keine erreichten Ergebnisse:

1. Mindestens 80 % erklären Go, Teilen, Beitritt und Aufzeichnung nach fünf Sekunden richtig; 15/16/17-Jährige getrennt betrachten.
2. Innerhalb von drei Sekunden erkennen, wer aus der Crew unterwegs ist; Treffpunkt aus Heute/Berg in höchstens zwei Aktionen erreichbar.
3. Konto ohne Freunde/Ausfahrten erstellt einen eigenen Plan mit klarer nächster Aktion; vorhandene private Go-Wünsche bleiben privat.
4. Konkrete Piste/Lift auswählen; Schwierigkeit, Datenquelle und Statusalter verstehen. Keine falsche Offen-Anzeige beim Quellausfall.
5. Anlagenabdeckung je Gebiet gegen datiertes Betreiberinventar dokumentieren; neue/umbenannte/entfernte Lifte im Aktualisierungsbericht sichtbar.
6. Bei fehlender Wartezeit/Route keine präzise Treffpunkt-ETA. Gemessene Fahrdauer und Prognosefehler getrennt berichten.
7. Dauerfreigabe bleibt ohne tägliche Neuzustimmung gesetzt; ausgeschaltete Freigabe startet weder beim Login noch durch Go/Tracking/Lift-Start erneut.
8. Keine Standort-/Widgetdaten für falsche Audience. Unter 16 bleiben Planung und Teilnahmezusage möglich, ohne neue Ortsstatus-Veröffentlichung.
9. 320/390px: keine Gesamtscreen-X-Bewegung, reale Touch-Swipes, mindestens 48px für Hauptaktionen, keine unbegrenzten Ladezustände; Reduced Motion respektieren.
10. Vorgeschlagene Karte-Perf-Gates: erster brauchbarer gecachter Ausschnitt innerhalb von 1 s; kalter Ausschnitt bei dokumentiertem gutem LTE innerhalb von 3 s, jeweils P75 auf festgelegten Mittelklassegeräten. Bei schlechten Netzen Plan/Offlinezustand statt leerer Endlosschleife. Ziel erst durch Messung bestätigen.
11. Trackingvergleich auf vergleichbaren Geräten/Strecken: Median/P95 Positionsfehler, Ausreißer, Lift-/Abfahrtssegmentierung, Lücken, Frische und Akku. Map-Geometriequalität ist eine eigene Messung. Auto-/Zugabschnitte dürfen keine Skiabfahrten erzeugen.
12. Pro Umsetzungsphase TDD, passende Komponenten-/Integrations-/Browser-/Gerätetests, mindestens 80 % Coverage, Lint/Typen/Build und Sicherheitsreview. Produktionsrelease mit geprüftem Commit und anschließendem öffentlichen Smoke-Test.
13. „Mein Tag“ in einer Aktion erreichbar; Avatar, Zeitlinie und angezeigte Werte synchron. Umschalten/Replay startet keine Aufzeichnung/Freigabe und beendet keine laufende Aufnahme. Alte Zusammenfassungen oder Messlücken bekommen keine erfundene Strecke.
14. Heutiges Replay funktioniert auch nach Abschluss und App-Neustart auf demselben Gerät innerhalb der lokalen Aufbewahrungszeit; falsches Konto, Abmelden, Löschen und Ablauf entfernen Zugriff/Daten. Cloud-Summen bleiben unabhängig.
15. Ein geprüftes Gebietspaket öffnet im Flugmodus nach Neustart. Kaputter/abgebrochener Download bleibt unvollständig; Speichergrenzen sind sichtbar. Ohne aktuelle Verbindung keine aktuelle Betriebs-/Freundesbehauptung.
16. Webcam vom gewählten Gebiet in höchstens zwei Aktionen; Quelle/Art/Fotozeit sichtbar oder ausdrücklich unbekannt. Ohne erlaubten Embed offizieller Link. Fehler, alte Bilder und externe Player werden getrennt von Live-Status geprüft.

## 9. Was dieser Plan ausdrücklich weiterführt oder ersetzt

- **Weitergeführt:** private bestehende Go-Wünsche, manuelle Beitritte, bestätigte Sitzplätze, Freundes-/Blockregeln, altersgetrenntes Entdecken, Standort/Liftstatus ab 16, unabhängige Aufzeichnung, Demo, Chat, Posts, Export/Löschung, deutsche/englische Texte und Testniveau.
- **Durch neuesten Auftrag ersetzt:** Namensänderung zu „Mitfahren, wenn’s passt“; der sichtbare Name wird wieder Pistl Go. Die bisherige Begrenzung auf ausschließlich vorhandene Ausfahrten reicht nicht mehr. Die bisherigen zeitbegrenzten Shares werden um bewusste Dauerfreigabe ergänzt.
- **Neuer Architekturvorschlag:** Die nur begrenzte abgerundete Kartenfläche aus [ADR 0039](../adr/0039-map-first-mountain-coordination.md) wird durch eine raumfüllende Bergansicht mit Detailleiste ersetzt. Erst bei Umsetzung als neue Entscheidung bestätigen; bestehende Sicherheitsklauseln behalten.
- **Nicht verloren:** Der gesamte [Konkurrenzkatalog](../qa/MOUNTAIN_UX_AUDIT.md#competitor-capability-map), Offlinekarten, Widgets, echte GPS-/Akkuvergleiche und Tests mit Jugendlichen. Ältere Dokumente bleiben als Historie erhalten; bei Umsetzung werden die betroffenen Specs/ADRs gezielt aktualisiert, nicht still überschrieben.
- **Ergänzung durch neuesten Foto-Auftrag:** Offline-Gebietspakete und Webcams kommen in den frühen Kartenumfang; „Mein Tag“ mit eigenem Avatar-Replay wird aus dem späteren Ausbau vorgezogen. Der bisherige Track-Löschzeitpunkt beim Abschluss wird durch begrenzte private lokale Aufbewahrung ersetzt. „Nur die Zusammenfassung auf dem Server“ bleibt zunächst erhalten.

## 10. Offene Abhängigkeiten und nächster Auftrag

Noch zu ermitteln: erlaubte Geometrie-/Status-/Offline-/Webcamquellen und Betriebskosten; identitätsstabile Zuordnung der Pilotgebiete; geeignete DEM-Qualität; real verfügbare Betreiber-Fahrzeiten; native Build-/Distributionstauglichkeit, lokale Speichergrenzen und konkretes Akkubudget. Eine lesbare Betreiber-Webseite ist noch keine zugesicherte API oder Weiterverwendungserlaubnis.

**Phase A: klickbarer neuer Ablauf plus echter Karten-Datenversuch** liegt zur ersten Abnahme vor. Die nächsten Schritte sind die Datenqualitätsprüfung und die Umsetzung der neuen Go-/Freigabe-Datenverträge nach gezieltem Architektur-/Privacy-Review. Bezahlte Verträge, externe Anfragen und reale Teilnehmerrekrutierung sind in diesem Plan nicht beauftragt.

## 11. Phase A: konkreter Stand

`/preview/mountain` zeigt Heute, Berg, Crew und Ich mit einem durchgängigen Go-Planer, prominentem Treffpunkt, echten Crew-Tab-Wischgesten, Kartensuche, auswählbaren OSM-Geometrien, DEM-3D, einem ausdrücklich synthetischen Avatar-Replay und offiziellen Webcam-Links. Die Nordkette-Geometrie umfasst 30 OSM-Wege: fünf Liftverläufe und 25 Pistenabschnitte. Das ist kein Vollständigkeitsnachweis; Inventar, Quellen und Rechte stehen im [Pilot-Datenaudit](../qa/PILOT_MAP_DATA.md).

Social-Daten, Zusagen, Standorttoggle und Replay sind sichtbar als Vorschau markiert. Go-Entwürfe leben ausschließlich im Speicher dieser offenen Seite; neue Entwürfe bewahren vorherige. Es gibt keine echten Einladungen, Standortfreigaben, GPS-Aufzeichnungen oder Offlinepakete aus dieser Vorschau. Die bestehenden produktiven Abläufe bleiben erhalten. [ADR 0041](../adr/0041-isolated-mountain-design-preview.md) dokumentiert die Grenze.

Prüfbare Abläufe sind in `features/mountain-preview/*.test.tsx`, den Daten-/Importtests und `tests/e2e/mountain-preview.spec.ts` hinterlegt: Planung ohne Ausfahrt/Freunde, private Simulation, richtige Gebiets-/Treffpunktzuordnung, kein Verlust vorheriger Entwürfe, unabhängiges Replay, unbekannter Liftstatus, 320/390px, echte Touch-Tab-Gesten, Kartenanbieter-Ausfall und automatisierte Barrierefreiheit. Interviews/5-Sekunden-Tests mit echten Jugendlichen, GPS-/Akkuvergleich, Betreiberzuordnung aller Anlagen und physische Native-/Offline-Abnahme sind weiterhin ausstehend. Phase A ersetzt diese Nachweise nicht.

## 12. Erster produktiver Go-Schritt

Eigene private Skitage sind in `features/day-plans` umgesetzt: Gebiet, Wiener Datum, Uhrzeit, Anreiseabsicht und Treffpunkt, mit Speichern/Neuladen/Bearbeiten/Löschen. Heute zeigt den nächsten anstehenden Treffpunkt. Eine ausdrückliche Aktion bereitet das bestehende Ausfahrtformular vor; Veröffentlichung, Fahrstil, Kapazität und Audience bleiben darin eigene Entscheidungen. Bestehende Go-Wünsche bleiben erreichbar.

[Die Spezifikation](go-day-plans.md) und [ADR 0042](../adr/0042-private-go-day-plans.md) halten Session/MFA, private Audience, Quoten, Wiederholungen, Ablauf, Export und Löschung fest. Die 3-Schritt-Demo ist nur bis zum Neuladen verfügbar. Gemeinsame Plan-Zusagen, echte permanente Standortfreigabe/Widgets, flächendeckende Vektorpisten, eigene Replays, vollständige Liftzuordnung und Offlinepakete bleiben offen; ihre Ziele und Abnahmen oben bleiben erhalten.

## 13. Erster produktiver Karten-Schritt

Der nächste begrenzte Schritt übernimmt das vorhandene Nordkette-Quellnetz in die normale Karte und Demo. „Pisten & Lifte“ bleibt direkt an der Karte sichtbar. Antippen oder Listenauswahl führt zu konkreten Abschnitts-/Liftinformationen mit Schwierigkeit, Inventarstand, OSM-Version und Quellenlink. Gleichnamige Abschnitte werden unterschieden. Die Auswahl bleibt nach Schließen der Details markiert. Webcam- und Betriebsstatus-Zugänge führen ausdrücklich zum Betreiber.

Die gemeinsame Datenbasis liegt in `features/mountain-data`; Vorschau und normale Karte verwenden denselben Snapshot. Die [Karten-Spezifikation](ski-map-and-conditions.md#selectable-nordkette-map--2026-10-10) beschreibt Umfang und Tests. Fünf Liftlinien und 25 Pistenabschnitte sind weiterhin keine vollständige Zuordnung aller Anlagen oder Abfahrten. Fehlende Wartezeiten, unbekannter Betriebsstatus und ungeprüfte OSM-Fahrzeiten bleiben erkennbar. Dieser Schritt erfüllt nur die Such-/Auswahlkomponente von Phase B; vollständige Inventarprüfung, echte Replay-Zeitdaten, Dauerfreigabe, Widgets und Offlinepakete bleiben offene Ziele.

## 14. Betreiberanlagen und belastbare Zeitangaben

Die normale Karte führt jetzt alle sechs Nordkette-Betreiberanlagen mit eigenem Prüfstand. Vier sind anhand von Quellnamen zugeordnet; Hungerburgbahn hat noch keinen gebündelten Verlauf, der unbenannte Förderband-Weg bleibt ein unbestätigter Zauberteppich-Kandidat. Beide Anlagen sind trotzdem auffindbar und bieten Betreiberinformationen. Geometrie, Betreiberinventar und Treffpunkt-IDs bleiben getrennt ([ADR 0043](../adr/0043-source-backed-mountain-facilities.md)).

Die Seegrubenbahn zeigt die veröffentlichte Mindestfahrdauer von 6,5 Minuten, die Hafelekarbahn die ungefähr vier Minuten aus der Betreiberquelle. Hungerburgbahn nennt beide widersprüchlichen Quellenwerte (6/8 Minuten) ohne einen davon als gesichert auszuwählen. Der 15-Minuten-Abfahrtstakt der drei Bahnen ist eine eigene Angabe, keine Wartezeit. OSM-Minuten bleiben als ungeprüfte zweite Quelle erkennbar.

Der Import kann nun Standseilbahn-Gleise erfassen, doch die Datenabfragen lieferten in dieser Etappe keinen verwendbaren neuen Snapshot. Fehlender Verlauf, belegte Stationsknoten, vollständige Pistenidentitäten, aktuelle Betriebsdaten und gemessene Fahr-/Wartezeiten bleiben offen. Ebenso bleiben echtes eigenes Replay, Offlinepakete, dauerhafte Freundesfreigabe und Widgets erhaltene nächste Ziele.
