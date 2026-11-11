export const MAX_PHOTO_EDGE = 1280;
export const PHOTO_QUALITY = 0.8;

/** Scales dimensions so the longest side is at most `maxEdge`. Never enlarges. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_PHOTO_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
