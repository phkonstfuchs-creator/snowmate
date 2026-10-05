import type { Metadata } from "next";
import LegalPage from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "Lizenzen & Quellen · Pistl" };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

/* Everything in Pistl that others made, with its licence. Kept in step
   with the providers in components/map/map-style.ts, features/conditions
   and features/resorts/resort-photo.ts. */
export default function LizenzenPage() {
  return (
    <LegalPage title="Lizenzen & Quellen">
      <p lang="en"><em>Third-party data, pictures, fonts and software used in Pistl, with their licences.</em></p>

      <h2>Karte</h2>
      <ul>
        <li>
          Kartendaten © <A href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</A>, verfügbar unter
          der <A href="https://opendatacommons.org/licenses/odbl/1-0/">Open Database License (ODbL) 1.0</A>.
        </li>
        <li>
          Kartenkacheln von <A href="https://openfreemap.org">OpenFreeMap</A> im Schema von{" "}
          <A href="https://openmaptiles.org">OpenMapTiles</A>, Kartenstil „Positron“ von CARTO; ersatzweise Kacheln von{" "}
          <A href="https://carto.com/attributions">CARTO</A>.
        </li>
        <li>
          Pisten und Lifte: <A href="https://www.opensnowmap.org">OpenSnowMap</A>, Daten © OpenStreetMap-Mitwirkende (ODbL).
        </li>
        <li>
          Geländeschattierung: Terrain Tiles von Mapzen über AWS Open Data, aus Quellen wie USGS, NASA SRTM und EU-DEM;
          vollständige Quellenangabe <A href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">hier</A>.
        </li>
        <li>
          Kartendarstellung mit <A href="https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt">MapLibre GL JS</A>{" "}
          (BSD-3-Clause).
        </li>
      </ul>

      <h2>Schnee und Wetter</h2>
      <p>
        Wetterdaten von <A href="https://open-meteo.com">Open-Meteo.com</A>, lizenziert unter{" "}
        <A href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</A>; Modellwerte nationaler Wetterdienste.
      </p>

      <h2>Fotos der Skigebiete</h2>
      <p>
        Die Fotos stammen aus den Artikeln der deutschsprachigen Wikipedia und liegen bei Wikimedia Commons. Pistl zeigt
        nur Fotos unter freien Lizenzen (CC0, CC BY, CC BY-SA, gemeinfrei). Urheber, Lizenz und Quelle stehen direkt unter
        jedem Foto. Die Fotos werden für die Anzeige verkleinert und zugeschnitten.
      </p>

      <h2>Schriften</h2>
      <ul>
        <li>Hanken Grotesk, Hanken Design Co.</li>
        <li>Jost, indestructible type*</li>
        <li>Space Mono, Colophon Foundry</li>
      </ul>
      <p>
        Alle unter der <A href="https://openfontlicense.org">SIL Open Font License 1.1</A>, ausgeliefert über{" "}
        <A href="https://fontsource.org">Fontsource</A>.
      </p>

      <h2>Symbole</h2>
      <p>
        <A href="https://lucide.dev/license">Lucide</A>, ISC-Lizenz.
      </p>

      <h2>Software</h2>
      <p>
        Pistl baut auf Open-Source-Software, unter anderem <A href="https://github.com/vercel/next.js/blob/canary/license.md">Next.js</A>,{" "}
        <A href="https://github.com/facebook/react/blob/main/LICENSE">React</A>,{" "}
        <A href="https://github.com/supabase/supabase-js/blob/master/LICENSE">supabase-js</A> und{" "}
        <A href="https://github.com/colinhacks/zod/blob/main/LICENSE">Zod</A> (jeweils MIT-Lizenz). Die Lizenztexte stehen
        unter den Links.
      </p>
    </LegalPage>
  );
}
