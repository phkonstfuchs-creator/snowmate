import Image from "next/image";

/* The brand stays the original penguin, only reduced to the
   screen-print spot colours (public/logo-print.png, generated from
   public/logo.png). Hat in rust, beak and tongue in ochre, snow on
   the paper tone, sky in the palette blue. */

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
