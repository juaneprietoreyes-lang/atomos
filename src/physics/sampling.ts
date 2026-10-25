import { maxHarmonicSquared, realHarmonic } from './harmonics';
import { radial, radialCutoff } from './radial';
import { hashSeed, mulberry32 } from './random';

/**
 * Muestreo Monte Carlo de |ψ_nlm|² para el hidrogenoide con Z = 1.
 *
 * Coordenadas reducidas: R_nl depende de r solo a través de Z·r, así que la nube
 * para cualquier Z_eff es la de Z = 1 escalada por 1/Z_eff. Por eso la caché va
 * por (n, l, m) y el cambio de elemento es un simple escalado.
 *
 * Como |ψ|² = R(r)²·Y(θ,φ)² se factoriza, se muestrea cada parte por separado,
 * sin la autocorrelación de Metropolis:
 *  - r: transformada inversa de la densidad radial r²R² tabulada en una rejilla fina;
 *  - dirección: rechazo uniforme sobre la esfera con la cota max(Y²).
 * Así salen solos los nodos radiales (esfera del 2s) y angulares (conos del d_z²).
 */

export interface OrbitalSample {
  /** x, y, z intercalados, en unidades de a₀/Z_eff */
  positions: Float32Array;
  /** +1 / −1: signo de ψ en cada punto (fase) */
  signs: Int8Array;
}

const GRID = 8192;
const cdfCache = new Map<string, { r: Float64Array; cdf: Float64Array }>();

function radialCdf(n: number, l: number): { r: Float64Array; cdf: Float64Array } {
  const key = `${n},${l}`;
  const hit = cdfCache.get(key);
  if (hit) return hit;
  const rMax = radialCutoff(n);
  const r = new Float64Array(GRID + 1);
  const cdf = new Float64Array(GRID + 1);
  let prev = 0;
  for (let i = 0; i <= GRID; i++) {
    r[i] = (rMax * i) / GRID;
    const R = radial(n, l, r[i]);
    const p = r[i] * r[i] * R * R;
    // regla del trapecio acumulada
    cdf[i] = i === 0 ? 0 : cdf[i - 1] + ((p + prev) / 2) * (rMax / GRID);
    prev = p;
  }
  const total = cdf[GRID];
  for (let i = 0; i <= GRID; i++) cdf[i] /= total;
  const table = { r, cdf };
  cdfCache.set(key, table);
  return table;
}

function sampleRadius(table: { r: Float64Array; cdf: Float64Array }, u: number): number {
  const { r, cdf } = table;
  let lo = 0;
  let hi = cdf.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < u) lo = mid;
    else hi = mid;
  }
  const span = cdf[hi] - cdf[lo];
  const t = span > 0 ? (u - cdf[lo]) / span : 0;
  return r[lo] + t * (r[hi] - r[lo]);
}

export function sampleOrbital(n: number, l: number, m: number, count: number, seed = hashSeed(`${n}${l}${m}`)): OrbitalSample {
  const rand = mulberry32(seed);
  const table = radialCdf(n, l);
  const bound = maxHarmonicSquared(l, m) * 1.02;
  const positions = new Float32Array(count * 3);
  const signs = new Int8Array(count);

  for (let i = 0; i < count; i++) {
    // Dirección con densidad Y²: propuesta uniforme en la esfera + rechazo
    let theta = 0;
    let phi = 0;
    let y = 0;
    for (;;) {
      const cosT = 2 * rand() - 1;
      theta = Math.acos(cosT);
      phi = 2 * Math.PI * rand();
      y = realHarmonic(l, m, theta, phi);
      if (rand() * bound <= y * y) break;
    }
    const r = sampleRadius(table, rand());
    const sinT = Math.sin(theta);
    positions[i * 3] = r * sinT * Math.cos(phi);
    positions[i * 3 + 1] = r * sinT * Math.sin(phi);
    positions[i * 3 + 2] = r * Math.cos(theta);
    const sign = Math.sign(radial(n, l, r) * y);
    signs[i] = sign >= 0 ? 1 : -1;
  }
  return { positions, signs };
}
