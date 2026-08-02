import Image from "next/image";

/* Die Marke bleibt der Original-Pinguin — nur auf die
   Siebdruck-Spotfarben reduziert (public/logo-print.png, erzeugt
   aus public/logo.png). Mütze rostrot, Schnabel und Zunge ocker,
   Schnee auf Papierton, Himmel im Blau der Palette. */

interface PenguinMascotProps {
  size?: number;
  className?: string;
}

export default function PenguinMascot({ size = 40, className = "" }: PenguinMascotProps) {
  return (
    <Image
      src="/logo-print.png"
      alt="Snowmate"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      loading="eager"
      unoptimized
    />
  );
}
