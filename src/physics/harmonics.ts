import { assocLegendre, logFactorial } from './special';

/**
 * Armónicos esféricos REALES normalizados (∫ Y² dΩ = 1):
 *   m = 0:  Y = √((2l+1)/4π) · P_l(cos θ)
 *   m > 0:  Y = √2 · K · P_l^m(cos θ) · cos(mφ)
 *   m < 0:  Y = √2 · K · P_l^|m|(cos θ) · sin(|m|φ)
 * con K = √((2l+1)/4π · (l−|m|)!/(l+|m|)!). Son combinaciones de los complejos
 * con la misma energía y dan las formas de los libros: px, d_z², f_xyz…
 */
export function realHarmonic(l: number, m: number, theta: number, phi: number): number {
  const am = Math.abs(m);
  const k = Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * Math.exp(logFactorial(l - am) - logFactorial(l + am)));
  const p = assocLegendre(l, am, Math.cos(theta));
  if (m === 0) return k * p;
  return Math.SQRT2 * k * p * (m > 0 ? Math.cos(am * phi) : Math.sin(am * phi));
}

/** Igual que realHarmonic pero a partir de un vector unitario (x, y, z) */
export function realHarmonicXYZ(l: number, m: number, x: number, y: number, z: number): number {
  return realHarmonic(l, m, Math.acos(Math.max(-1, Math.min(1, z))), Math.atan2(y, x));
}

const NAMES: Record<number, Record<number, string>> = {
  0: { 0: 's' },
  1: { 0: 'p_z', 1: 'p_x', [-1]: 'p_y' },
  2: { 0: 'd_z²', 1: 'd_xz', [-1]: 'd_yz', 2: 'd_x²−y²', [-2]: 'd_xy' },
  3: {
    0: 'f_z³',
    1: 'f_xz²',
    [-1]: 'f_yz²',
    2: 'f_z(x²−y²)',
    [-2]: 'f_xyz',
    3: 'f_x(x²−3y²)',
    [-3]: 'f_y(3x²−y²)',
  },
};

/** Nombre del orbital real: «p_x», «d_z²»… */
export const orbitalName = (l: number, m: number): string => NAMES[l]?.[m] ?? `l=${l},m=${m}`;

const maxCache = new Map<string, number>();

/** Máximo de Y² sobre la esfera (búsqueda en rejilla fina); cota para el muestreo por rechazo */
export function maxHarmonicSquared(l: number, m: number): number {
  const key = `${l},${m}`;
  const cached = maxCache.get(key);
  if (cached !== undefined) return cached;
  let max = 0;
  const N = 360;
  for (let i = 0; i <= N; i++) {
    const theta = (Math.PI * i) / N;
    for (let j = 0; j < 2 * N; j++) {
      const y = realHarmonic(l, m, theta, (Math.PI * j) / N);
      if (y * y > max) max = y * y;
    }
  }
  maxCache.set(key, max);
  return max;
}
