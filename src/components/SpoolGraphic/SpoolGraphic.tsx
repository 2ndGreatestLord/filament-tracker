import { useId, type ReactNode } from 'react';
import { paintStops, type Paint } from '../../domain/paint';
import { filamentRadius, holesPath, REEL, reelHoles } from '../../domain/reel';

const HOLES = holesPath(reelHoles());
const PLATE = '#25272d';
const INTERIOR = '#08090b';
const EDGE = '#ffffff26';

interface SpoolGraphicProps {
  paint: Paint;
  /** Fraction remaining, from 0 to 1, drawn as the filament seen through the holes. */
  fraction: number;
  /** How far the reel has turned, in degrees clockwise. */
  rotation?: number;
  /** Accessible description. Leave out when nearby text already says it. */
  title?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * The app's signature: a reel modelled on a real spool, with a grid of holes in the side
 * plate, a solid hub, and a label pad. The filament sits behind the plate and shows only
 * through the holes, sized to how much is left.
 */
export function SpoolGraphic({
  paint,
  fraction,
  rotation = 0,
  title,
  className,
  children,
}: SpoolGraphicProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const filled = Math.min(1, Math.max(0, fraction));
  const stops = paintStops(paint);
  const outer = filamentRadius(filled);
  const width = outer - REEL.filamentCore;
  const middle = (outer + REEL.filamentCore) / 2;
  const filament = stops.length > 1 ? `url(#${id}-paint)` : stops[0]!;
  const spin = `rotate(${rotation} 50 50)`;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  const pad = REEL.labelPad;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      data-fraction={filled}
      data-rotation={rotation}
      {...a11y}
    >
      <defs>
        <mask id={`${id}-plate`}>
          <circle cx="50" cy="50" r={REEL.rim} fill="#fff" />
          <circle cx="50" cy="50" r={REEL.centerHole} fill="#000" />
          <path d={HOLES} fill="#000" />
        </mask>
        {stops.length > 1 && (
          <linearGradient id={`${id}-paint`} gradientUnits="userSpaceOnUse" x1="14" y1="14" x2="86" y2="86">
            {stops.map((color, index) => (
              <stop key={`${color}-${index}`} offset={index / (stops.length - 1)} stopColor={color} />
            ))}
          </linearGradient>
        )}
        {paint.shiny && (
          <linearGradient id={`${id}-sheen`} gradientUnits="userSpaceOnUse" x1="16" y1="16" x2="84" y2="84">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.3" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="0.43" stopColor="#fff" stopOpacity="0.8" />
            <stop offset="0.56" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="0.72" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        )}
      </defs>

      <g transform={spin}>
        <circle cx="50" cy="50" r={REEL.filamentFull} fill={INTERIOR} />
        {width > 0.05 && (
          <circle
            data-part="filament"
            cx="50"
            cy="50"
            r={middle}
            fill="none"
            stroke={filament}
            strokeWidth={width}
          />
        )}
      </g>

      {/* The light stays put while the reel turns, so the sheen isn't rotated. */}
      {paint.shiny && width > 0.05 && (
        <circle
          data-part="sheen"
          cx="50"
          cy="50"
          r={middle}
          fill="none"
          stroke={`url(#${id}-sheen)`}
          strokeWidth={width}
        />
      )}

      <g transform={spin} data-part="reel">
        <circle cx="50" cy="50" r={REEL.rim} fill={PLATE} mask={`url(#${id}-plate)`} />
        <circle cx="50" cy="50" r={REEL.rim - 0.4} fill="none" stroke={EDGE} strokeWidth="0.8" />
        <circle cx="50" cy="50" r={REEL.hub} fill="none" stroke="#ffffff14" strokeWidth="0.7" />
        <circle cx="50" cy="50" r={REEL.centerHole} fill="none" stroke={EDGE} strokeWidth="0.8" />
        <circle cx="50" cy="50" r={REEL.centerHole - 2.2} fill="none" stroke="#ffffff12" strokeWidth="1.2" />
        <rect
          x={pad.x}
          y={pad.y}
          width={pad.width}
          height={pad.height}
          rx={pad.radius}
          fill="#2c2f36"
          stroke="#ffffff1f"
          strokeWidth="0.6"
        />
      </g>
      {children}
    </svg>
  );
}
