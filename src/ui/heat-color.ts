/**
 * Escala perceptual para el mapa de calor (paradas de viridis, interpolada en sRGB).
 * Uniforme en luminosidad y legible para daltonismo.
 */
const STOPS: [number, number, number][] = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

export function heatColor(t: number): { bg: string; fg: string } {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const [r, g, b] = STOPS[i].map((c, k) => Math.round(c + (STOPS[i + 1][k] - c) * f));
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { bg: `rgb(${r} ${g} ${b})`, fg: luminance > 0.5 ? '#0b0f17' : '#f4f7fb' };
}
