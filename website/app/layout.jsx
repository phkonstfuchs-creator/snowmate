import "@fontsource-variable/hanken-grotesk";
import "@fontsource/space-mono/400.css";
import { siteUrl, launchReady } from "../lib/site";
import "./globals.css";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Pistl — Ab auf den Berg.", template: "%s | Pistl" },
  description: "Plane deinen nächsten Skitag mit Freunden und finde eine Mitfahrt. Pistl für Skifahrer und Snowboarder rund um Innsbruck und Salzburg. Jetzt früh testen.",
  robots: { index: launchReady, follow: launchReady },
  openGraph: { type: "website", locale: "de_AT", siteName: "Pistl", title: "Pistl — Ab auf den Berg.", description: "Rides finden. Plätze teilen. Zusammen auf den Berg. Early Access startet bald." },
  twitter: { card: "summary_large_image" },
};
export const viewport = { themeColor: "#f6f7f4" };

export default function RootLayout({ children }) {
  return <html lang="de" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main">Zum Inhalt springen</a>{children}</body></html>;
}
