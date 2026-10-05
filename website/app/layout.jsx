import "@fontsource-variable/hanken-grotesk";
import "@fontsource/space-mono/400.css";
import { siteUrl, launchReady } from "../lib/site";
import "./globals.css";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Pistl — Wer fährt heute wohin?", template: "%s | Pistl" },
  description: "Wer fährt heute wo, und kann ich mit? Pistl verbindet Skifahrer und Snowboarder rund um Innsbruck und Salzburg. Jetzt für Early Access vormerken.",
  robots: { index: launchReady, follow: launchReady },
  openGraph: { type: "website", locale: "de_AT", siteName: "Pistl", title: "Pistl — Wer fährt heute wohin?", description: "Rides finden. Plätze teilen. Zusammen auf den Berg. Early Access startet bald." },
  twitter: { card: "summary_large_image" },
};
export const viewport = { themeColor: "#f6f7f4" };

export default function RootLayout({ children }) {
  return <html lang="de" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main">Zum Inhalt springen</a>{children}</body></html>;
}
