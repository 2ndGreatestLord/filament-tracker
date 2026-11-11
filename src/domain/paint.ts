/** How a filament looks: one color, or a gradient of up to four, optionally shiny. */
export interface Paint {
  /** The main color. For a gradient, also its first stop. */
  colorHex: string;
  /** Every gradient stop, first one included. Only a gradient when it has 2 or more. */
  colorStops?: readonly string[];
  shiny?: boolean;
}

export const MAX_STOPS = 4;

export function paintStops(paint: Paint): string[] {
  return paint.colorStops && paint.colorStops.length >= 2
    ? [...paint.colorStops]
    : [paint.colorHex];
}

export function isGradient(paint: Paint): boolean {
  return paintStops(paint).length > 1;
}

/** Identifies a look, so the same color is never saved twice. */
export function paintKey(paint: Paint): string {
  return `${paintStops(paint).join(',').toLowerCase()}|${paint.shiny ? 'shiny' : 'flat'}`;
}

const SHEEN =
  'linear-gradient(135deg, rgba(255,255,255,0) 22%, rgba(255,255,255,0.75) 45%, rgba(255,255,255,0) 66%)';

/** A CSS `background` value for swatches and dots. */
export function paintBackground(paint: Paint): string {
  const stops = paintStops(paint);
  const base = stops.length > 1 ? `linear-gradient(135deg, ${stops.join(', ')})` : stops[0]!;
  return paint.shiny ? `${SHEEN}, ${base}` : base;
}

/** Words for the look, so it is never described by color alone. */
export function paintDescription(paint: Paint, name?: string): string {
  const parts = [name ?? (isGradient(paint) ? 'Custom gradient' : 'Custom color')];
  if (name && isGradient(paint)) parts.push('gradient');
  if (paint.shiny) parts.push('shiny');
  return parts.join(', ');
}
