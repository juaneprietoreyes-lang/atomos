/**
 * Color percibido de luz monocromática: funciones de igualación CIE 1931 (2°)
 * con el ajuste analítico de Wyman, Sloan y Shirley (2013) → XYZ → sRGB (D65).
 * Los colores espectrales puros caen fuera del gamut sRGB: se desaturan añadiendo
 * blanco lo justo para que ningún canal sea negativo.
 */
export type SpectralRegion = 'UV' | 'visible' | 'IR';

export const VISIBLE_MIN_NM = 380;
export const VISIBLE_MAX_NM = 750;

export const spectralRegion = (nm: number): SpectralRegion =>
  nm < VISIBLE_MIN_NM ? 'UV' : nm > VISIBLE_MAX_NM ? 'IR' : 'visible';

const g = (x: number, mu: number, s1: number, s2: number): number => {
  const t = (x - mu) / (x < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
};

export function cie1931(nm: number): [number, number, number] {
  const x = 1.056 * g(nm, 599.8, 37.9, 31.0) + 0.362 * g(nm, 442.0, 16.0, 26.7) - 0.065 * g(nm, 501.1, 20.4, 26.2);
  const y = 0.821 * g(nm, 568.8, 46.9, 40.5) + 0.286 * g(nm, 530.9, 16.3, 31.1);
  const z = 1.217 * g(nm, 437.0, 11.8, 36.0) + 0.681 * g(nm, 459.0, 26.0, 13.8);
  return [x, y, z];
}

const gammaEncode = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/**
 * Color sRGB (0–1) de una longitud de onda. Dentro del visible, a brillo máximo y
 * atenuado en los extremos donde el ojo apenas ve; fuera, un color convencional
 * (violeta tenue para UV, rojo oscuro para IR) que la UI acompaña con la etiqueta.
 */
export function wavelengthToRgb(nm: number): { r: number; g: number; b: number; region: SpectralRegion } {
  const region = spectralRegion(nm);
  if (region === 'UV') return { r: 0.55, g: 0.45, b: 1, region };
  if (region === 'IR') return { r: 0.55, g: 0.12, b: 0.1, region };
  const [X, Y, Z] = cie1931(nm);
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  const w = -Math.min(0, r, gg, b);
  r += w;
  gg += w;
  b += w;
  const max = Math.max(r, gg, b) || 1;
  // Atenuación suave en los bordes del visible (380–420 y 700–750 nm)
  const edge = nm < 420 ? 0.35 + 0.65 * ((nm - 380) / 40) : nm > 700 ? 0.35 + 0.65 * ((750 - nm) / 50) : 1;
  return { r: gammaEncode((r / max) * edge), g: gammaEncode((gg / max) * edge), b: gammaEncode((b / max) * edge), region };
}

export const rgbCss = ({ r, g, b }: { r: number; g: number; b: number }): string =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
