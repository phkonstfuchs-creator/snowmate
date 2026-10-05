import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Pistl — Wer fährt heute wohin? Rides, Mitfahrten und deine Crew.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const image = await readFile(path.join(process.cwd(), "public/alpine-panorama.png"));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f6f7f3", color: "#1e302b", padding: "54px 64px", position: "relative" }}>
      {/* ImageResponse renders this embedded raster directly; next/image is not supported here. */}
      <img src={`data:image/png;base64,${image.toString("base64")}`} alt="" width={1200} height={400} style={{ position: "absolute", left: 0, bottom: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 20 }}><span>pistl</span><span>INNSBRUCK — SALZBURG</span></div>
      <div style={{ display: "flex", flexDirection: "column", fontWeight: 700, fontSize: 100, lineHeight: 1, letterSpacing: "-6px", marginTop: 35 }}><span>WER FÄHRT</span><span>HEUTE WOHIN?</span></div>
      <div style={{ display: "flex", position: "absolute", bottom: 38, left: 64, background: "#315842", color: "#f6f7f3", padding: "14px 24px", borderRadius: 99, fontSize: 20 }}>Early Access startet bald.</div>
    </div>, size,
  );
}
