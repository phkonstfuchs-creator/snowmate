# Komponenten und Gestaltung

## Scrolltide: geprüfte Vorschauen, eigene Implementierung

Am 5. Oktober 2026 wurden die Bibliothek sowie die Detailvorschau dieser Scrolltide-Komponente im Browser geöffnet und visuell geprüft:

- [Focus Reveal](https://www.scrolltide.co/#c-focus-reveal): Geprüft, aber die scrollgebundene Reveal-Animation der Überschrift wurde nach Nutzerfeedback entfernt. Die reduzierte Scroll-Reveal der Inhaltsabschnitte nutzt Intersection Observer, bleibt bei `prefers-reduced-motion` aus und zeigt den Inhalt ohne JavaScript weiterhin normal.
- [Wordmark Bleed](https://www.scrolltide.co/#s-wordmark-bleed): Reduzierter dunkler Footer, kompakte Links und eine große, unten angeschnittene Wortmarke. `components/Footer.jsx` interpretiert diesen Aufbau mit Pistl, den tatsächlichen Kontakt-/Rechtsseiten und dynamischem Jahr.

Die Focus-Reveal-Komponente ist kostenpflichtig. Es wurde kein gesperrter Code oder Prompt übernommen; die Implementierung ist selbst geschrieben und von der öffentlich sichtbaren Vorschau inspiriert.

- [Scrolltide Komponentenübersicht](https://www.scrolltide.co/components): außerdem die Ideen Spotlight Carousel und Send Halo geprüft; ihre Bild-/Schimmer-Effekte passen zu den vorhandenen App-Ansichten und der reduzierten Gestaltung nicht.

## Weitere beibehaltene Referenzen

- [Jade Sky / 21st.dev Gradient Builder](https://21st.dev/community/gradients/editor?from=85ea2692-591f-4b2b-928f-de88da3d1a88): CSS-Farbverläufe als ruhige Farbstimmung über der Panorama-Illustration. Eigene `components/ui/JadeSky.jsx` Komponente, stark weichgezeichnet und transparent reduziert. Kein Code oder Asset extern geladen.
- [Waitlist Form / Preet Suthar](https://21st.dev/@preetsuthar17/components/waitlist-form-1): kompaktes Formular; eigene API-Logik, Einwilligung, optionaler Early Access, Lade-, Fehler- und Erfolgszustände.
- [FAQ Accordion / ScrollX UI](https://21st.dev/@scrollxui/components/frequently-asked-questions-with-accordion): eigenes natives `details`/`summary`, kein kopierter Code.

## Überarbeitung nach Nutzerfeedback

Entfernt: Skifahrer und Pinguin, Zeiger-Parallaxe, Karte und Event-Dekoration, Bergtag-Schritte, Crew-Poster und die vorherigen Funktions-Tabs samt Icon-Artwork. Drei klare Textzeilen zeigen jetzt, wie man Rides plant, Plätze teilt und die Crew am Berg trifft. Auf Wunsch sind alle Aktionsflächen nun rund. Das Panorama trennt dasselbe eigens generierte Motiv in ferne Gipfel und vordere Schneekante; geringe scrollgebundene Verschiebungen erzeugen Tiefe. Bei reduzierter Bewegung bleiben beide Ebenen still. Scroll-Reveals zeigen Inhaltsabschnitte beim Erreichen sanft an und sind bei reduzierter Bewegung ausgeschaltet. Die Anmeldung und E-Mail-Bestätigung nutzen die vorhandene Supabase-/Resend-Anbindung.

Die sichtbaren Nachweise für den übernommenen Jade-Sky-Verlauf, die lokal ausgelieferten OFL-Schriften und Lucide-Symbole stehen im Impressum. Unter `public/licenses/` liegen die vollständigen Lizenztexte. Keine fremden Vorschaubilder werden eingebunden.

## Bildasset

`public/alpine-panorama.png` (Original), `public/alpine-panorama.webp` (optimierte Webversion): mit dem eingebauten imagegen-Werkzeug generiert, nicht über eine API mit Nutzerschlüssel. Prompt:

> Create a wide 3:1 panoramic fine ink illustration for the public Snowmate ski website footer. Subject: an Austrian alpine ski landscape inspired by Tyrol, jagged snowy mountains in the middle background, small clusters of fir trees on both far sides and one tiny wooden mountain hut on the right. The foreground is a broad empty gently descending ski slope taking the bottom third, clean pale warm ivory snow. Style: sophisticated vintage copperplate engraving with fine dark brown crosshatching, like 1930s alpine travel ephemera, crisp detailed hand-drawn line work, muted screenprint pale icy blue shadows on mountains. Color palette only warm cream #f4efe4, dark brown #252820 and muted pale blue #adc1c5. Background and sky entirely flat warm cream #f4efe4; large quiet empty sky upper third. Wide horizontal composition edge to edge with no frame. No words, no letters, no people, no penguins, no skier, no logo, no UI, no watermark, no photorealism, no gradients. High quality professional editorial illustration. Save image as asset for project.

Das Bild wurde anschließend auf Wunsch vom Footer in den Einstieg verschoben. Das neue Pistl-Icon ist eine eigene SVG-Datei; der Pinguin aus dem ursprünglichen App-Logo wird auf der Website nicht mehr verwendet.
