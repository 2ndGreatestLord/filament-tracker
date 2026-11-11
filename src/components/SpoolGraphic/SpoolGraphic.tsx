import type { ReactNode } from 'react';

const SPECKLES = Array.from({ length: 26 }, (_, index) => {
  const distance = 16 + ((index * 7) % 17);
  const angle = index * 2.399963;
  return {
    cx: 50 + distance * Math.sin(angle),
    cy: 50 - distance * Math.cos(angle),
    r: 1 + (index % 3) * 0.5,
  };
});

interface SpoolGraphicProps {
  colorHex: string;
  /** Fraction remaining, from 0 to 1, drawn as the outer ring. */
  fraction: number;
  /** Accessible description. Leave out when nearby text already says it. */
  title?: string;
  className?: string;
  /** Extra SVG content drawn on top, in the 100×100 coordinate space. */
  children?: ReactNode;
}

/** The app's signature: a black reel with filament-coloured speckles and centre. */
export function SpoolGraphic({ colorHex, fraction, title, className, children }: SpoolGraphicProps) {
  const filled = Math.min(1, Math.max(0, fraction));
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  return (
    <svg viewBox="0 0 100 100" className={className} data-fraction={filled} {...a11y}>
      <circle cx="50" cy="50" r="45" fill="none" stroke="var(--track)" strokeWidth="6" />
      {filled > 0 && (
        <g transform="rotate(-90 50 50)" fill="none">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--ring-outline)"
            strokeWidth="6"
            pathLength="1"
            strokeDasharray={`${filled} 1`}
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={colorHex}
            strokeWidth="4.5"
            pathLength="1"
            strokeDasharray={`${filled} 1`}
          />
        </g>
      )}
      <circle cx="50" cy="50" r="38" fill="#0c0d10" stroke="#34373f" strokeWidth="1" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#24262c" strokeWidth="1" />
      {SPECKLES.map((speckle) => (
        <circle
          key={`${speckle.cx}-${speckle.cy}`}
          {...speckle}
          fill={colorHex}
          stroke="#ffffff55"
          strokeWidth="0.25"
        />
      ))}
      <circle cx="50" cy="50" r="11" fill={colorHex} stroke="#ffffff66" strokeWidth="0.75" />
      <circle cx="50" cy="50" r="3.5" fill="#0c0d10" />
      {children}
    </svg>
  );
}
