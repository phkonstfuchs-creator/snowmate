import type { Metadata, Viewport } from "next";
import "@fontsource-variable/jost";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snowmate",
  description: "Finde deine Crew. Heute.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Snowmate" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F2EADB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
