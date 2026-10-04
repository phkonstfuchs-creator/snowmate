# Komponenten und Gestaltung

## Scrolltide: geprüfte Vorschauen, eigene Implementierung

Am 4. Oktober 2026 wurden die Bibliothek sowie die Detailvorschauen dieser beiden Komponenten im Browser geöffnet und visuell geprüft:

- [Focus Reveal](https://www.scrolltide.co/#c-focus-reveal): In der geöffneten Vorschau wandert ein Fokusrahmen über unscharfe Wörter und stellt jeweils das fokussierte Wort scharf. Pistl verwendet eine kleine, scrollgebundene Fokusanimation an der Abschnittsüberschrift; der Produkttext bleibt direkt lesbar und die Animation schaltet sich bei `prefers-reduced-motion` ab. Der Komponenten-Code wurde nicht übernommen.
- [Wordmark Bleed](https://www.scrolltide.co/#s-wordmark-bleed): Reduzierter dunkler Footer, kompakte Links und eine große, unten angeschnittene Wortmarke. `components/Footer.jsx` interpretiert diesen Aufbau mit Pistl, den tatsächlichen Kontakt-/Rechtsseiten und dynamischem Jahr.

Beide Originale sind kostenpflichtig. Es wurde kein gesperrter Code oder Prompt übernommen; die Implementierung ist selbst geschrieben und von den öffentlich sichtbaren Vorschauen inspiriert.

- [Scrolltide Komponentenübersicht](https://www.scrolltide.co/components): außerdem die Ideen Spotlight Carousel und Send Halo geprüft; ihre Bild-/Schimmer-Effekte passen zu den vorhandenen App-Ansichten und der reduzierten Gestaltung nicht.

## Weitere beibehaltene Referenzen

- [Interactive Hover Button / Dillion Verma](https://21st.dev/@dillionverma/components/interactive-hover-button): eindeutiges Hover-Feedback bei den eigenen, reduzierten Buttons; Pfeilbewegung bei Interaktion.
- [Text Reveal / kuratlielia](https://21st.dev/@kuratlielia/components/text-reveal): Inspiration für den einmaligen Eintritt der Hero-Typografie; eigener CSS-Code.
- [Waitlist Form / Preet Suthar](https://21st.dev/@preetsuthar17/components/waitlist-form-1): kompaktes Formular; eigene API-Logik, Einwilligung, optionaler Early Access, Lade-, Fehler- und Erfolgszustände.
- [FAQ Accordion / ScrollX UI](https://21st.dev/@scrollxui/components/frequently-asked-questions-with-accordion): eigenes natives `details`/`summary`, kein kopierter Code.

## Überarbeitung nach Nutzerfeedback

Entfernt: Skifahrer und Pinguin, Zeiger-Parallaxe, Karte und Event-Dekoration, Bergtag-Schritte, Crew-Poster und die bisherigen Tab-/Handy-Komponenten. Die Seite konzentriert sich auf drei reale App-Funktionen, Schutzregeln, Anmeldung und FAQ. Es gibt keine erfundenen Interaktions-Demos. Hanken Grotesk für Titel und Lesetext, zurückhaltendes Weiß/Grün, keine blinkenden Statuspunkte. Reduzierte Bewegung wird respektiert.

## Bildasset

`public/alpine-panorama.png` (Original), `public/alpine-panorama.webp` (optimierte Webversion): mit dem eingebauten imagegen-Werkzeug generiert, nicht über eine API mit Nutzerschlüssel. Prompt:

> Create a wide 3:1 panoramic fine ink illustration for the public Snowmate ski website footer. Subject: an Austrian alpine ski landscape inspired by Tyrol, jagged snowy mountains in the middle background, small clusters of fir trees on both far sides and one tiny wooden mountain hut on the right. The foreground is a broad empty gently descending ski slope taking the bottom third, clean pale warm ivory snow. Style: sophisticated vintage copperplate engraving with fine dark brown crosshatching, like 1930s alpine travel ephemera, crisp detailed hand-drawn line work, muted screenprint pale icy blue shadows on mountains. Color palette only warm cream #f4efe4, dark brown #252820 and muted pale blue #adc1c5. Background and sky entirely flat warm cream #f4efe4; large quiet empty sky upper third. Wide horizontal composition edge to edge with no frame. No words, no letters, no people, no penguins, no skier, no logo, no UI, no watermark, no photorealism, no gradients. High quality professional editorial illustration. Save image as asset for project.

Das Bild wurde anschließend auf Wunsch vom Footer in den Einstieg verschoben. Das neue Pistl-Icon ist eine eigene SVG-Datei; der Pinguin aus dem ursprünglichen App-Logo wird auf der Website nicht mehr verwendet.
