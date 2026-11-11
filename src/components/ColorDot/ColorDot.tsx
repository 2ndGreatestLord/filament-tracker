import { paintBackground, type Paint } from '../../domain/paint';

interface ColorDotProps {
  paint: Paint;
  /** Accessible name. Leave out when nearby text already names the color. */
  label?: string;
  className?: string;
}

/** A small round swatch that shows solid, gradient, and shiny colors. */
export function ColorDot({ paint, label, className = 'h-3.5 w-3.5' }: ColorDotProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <span
      {...a11y}
      className={`inline-block shrink-0 rounded-full border border-line ${className}`}
      style={{ background: paintBackground(paint) }}
    />
  );
}
