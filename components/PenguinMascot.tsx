import Image from "next/image";

interface PenguinMascotProps {
  size?: number;
  className?: string;
}

export default function PenguinMascot({ size = 40, className = "" }: PenguinMascotProps) {
  return (
    <Image
      src="/logo.png"
      alt="Snowmate logo"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      loading="eager"
      unoptimized
    />
  );
}
