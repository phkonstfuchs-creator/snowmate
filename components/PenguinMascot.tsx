/* Snowmate-Marke als Siebdruck-Stempel: flache Formen, zwei
   Spotfarben, keine Verläufe, von Hand als SVG gezeichnet.
   Bewusst ohne Hintergrundszene und ohne clipPath — die Marke
   läuft ab 26px und muss dort noch lesbar sein, und eine feste
   clipPath-ID würde kollidieren, sobald zwei Instanzen auf einer
   Seite stehen (useId scheidet aus, weil die Marke auch in
   Server-Komponenten gerendert wird). */

interface PenguinMascotProps {
  size?: number;
  className?: string;
  /* Auf dunklem Grund die beiden Töne tauschen */
  inverted?: boolean;
  title?: string;
}

export default function PenguinMascot({
  size = 40,
  className = "",
  inverted = false,
  title = "Snowmate",
}: PenguinMascotProps) {
  const ink = inverted ? "var(--paper-0)" : "var(--ink-0)";
  const paper = inverted ? "var(--ink-0)" : "var(--paper-0)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={className}
      style={{ flexShrink: 0, display: "block" }}
    >
      {/* Doppelring wie ein aufgedrückter Hüttenstempel */}
      <circle cx="24" cy="24" r="22.5" fill={paper} stroke={ink} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke={ink} strokeWidth="1" />

      {/* Körper */}
      <path
        d="M24 9.5c5.6 0 9.2 4.3 9.2 10.4 0 4.5-.9 8.1-2.5 10.8-1.6 2.7-4 4.2-6.7 4.2s-5.1-1.5-6.7-4.2c-1.6-2.7-2.5-6.3-2.5-10.8C14.8 13.8 18.4 9.5 24 9.5Z"
        fill={ink}
      />
      {/* Flossen, leicht abgespreizt */}
      <path d="M15.4 20.6c-1.9 1.4-2.6 4.2-2 7.4.7 3.2 2.3 4.6 3.3 3.9 1-.7-.4-3.1-.8-5.9-.3-2.2-.1-4.4-.5-5.4Z" fill={ink} />
      <path d="M32.6 20.6c1.9 1.4 2.6 4.2 2 7.4-.7 3.2-2.3 4.6-3.3 3.9-1-.7.4-3.1.8-5.9.3-2.2.1-4.4.5-5.4Z" fill={ink} />
      {/* Bauch */}
      <path
        d="M24 16.8c2.4 0 4 2.3 4 6.1 0 4-1.7 7.4-4 7.4s-4-3.4-4-7.4c0-3.8 1.6-6.1 4-6.1Z"
        fill={paper}
      />
      {/* Schnabel als Raute in der zweiten Spotfarbe */}
      <path d="M24 18.9 26.9 21.1 24 23.3 21.1 21.1 Z" fill="var(--ochre)" />
      {/* Augen */}
      <circle cx="20.5" cy="15.9" r="1.35" fill={paper} />
      <circle cx="27.5" cy="15.9" r="1.35" fill={paper} />
      {/* Füße */}
      <path d="M20 34.6h3.2l-.6 2.4h-3.4Z" fill="var(--ochre)" />
      <path d="M28 34.6h-3.2l.6 2.4h3.4Z" fill="var(--ochre)" />
    </svg>
  );
}
