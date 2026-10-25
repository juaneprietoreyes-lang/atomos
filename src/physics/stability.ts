/**
 * Estabilidad de un núcleo (Z protones, N neutrones) según la tabla de núcleos
 * conocidos del OIEA (ENSDF). Aquí no se calcula nada: si un núcleo no está en la
 * tabla es que nunca se ha observado, y se dice así.
 */

/** [Z, N, semivida en s (0 = estable, null = desconocida), modo de desintegración] */
export type NuclideRow = [number, number, number | null, string];

export type Stability =
  | { kind: 'stable' }
  | { kind: 'radioactive'; halfLifeSeconds: number | null; decay: string }
  | { kind: 'unobserved' };

export function makeLookup(rows: NuclideRow[]): (z: number, n: number) => Stability {
  const map = new Map<string, NuclideRow>();
  for (const r of rows) map.set(`${r[0]},${r[1]}`, r);
  return (z, n) => {
    const r = map.get(`${z},${n}`);
    if (!r) return { kind: 'unobserved' };
    if (r[2] === 0) return { kind: 'stable' };
    return { kind: 'radioactive', halfLifeSeconds: r[2], decay: r[3] };
  };
}

/** Neutrones de los núcleos conocidos de un elemento: [mínimo, máximo] */
export function knownNeutronRange(rows: NuclideRow[], z: number): [number, number] | null {
  const ns = rows.filter((r) => r[0] === z).map((r) => r[1]);
  return ns.length ? [Math.min(...ns), Math.max(...ns)] : null;
}

/**
 * Cuánto tiembla la pantalla (0–1): nada si es estable; más cuanto más corta es la
 * semivida (escala logarítmica: 10¹⁶ s ≈ 300 millones de años → 0,1; 1 µs → 1).
 */
export function shakeIntensity(st: Stability): number {
  if (st.kind === 'stable') return 0;
  if (st.kind === 'unobserved') return 1;
  if (st.halfLifeSeconds === null) return 0.8;
  const log = Math.log10(Math.max(st.halfLifeSeconds, 1e-30));
  return Math.min(1, Math.max(0.1, 0.1 + (0.9 * (16 - log)) / 22));
}

const DECAY_LABELS: Record<string, string> = {
  'B-': 'β⁻: un neutrón se convierte en protón y sale un electrón',
  '2B-': 'doble β⁻: dos neutrones se convierten en protones',
  'B-N': 'β⁻ seguida de la emisión de un neutrón',
  'B-2N': 'β⁻ seguida de la emisión de dos neutrones',
  'B-A': 'β⁻ seguida de una partícula alfa',
  'EC+B+': 'β⁺ o captura electrónica: un protón se convierte en neutrón',
  EC: 'captura electrónica: un protón atrapa un electrón y se convierte en neutrón',
  'B+': 'β⁺: un protón se convierte en neutrón y sale un positrón',
  '2EC': 'doble captura electrónica',
  '2B+': 'doble β⁺',
  ECP: 'captura electrónica seguida de la emisión de un protón',
  'B+P': 'β⁺ seguida de la emisión de un protón',
  ECSF: 'captura electrónica seguida de fisión',
  A: 'alfa: expulsa un núcleo de helio (2 protones y 2 neutrones)',
  P: 'emite un protón',
  '2P': 'emite dos protones',
  N: 'emite un neutrón',
  '2N': 'emite dos neutrones',
  SF: 'fisión espontánea: se parte en dos núcleos',
  IT: 'transición isomérica (emite un rayo gamma)',
};

export const decayLabel = (code: string): string => DECAY_LABELS[code] ?? 'modo de desintegración desconocido';

/** Semivida legible en español: «5700 años», «19,3 s», «0,7 zs» */
export function formatHalfLife(seconds: number): string {
  const YEAR = 365.25 * 86400;
  const f = (v: number, unit: string) => {
    const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    return `${v.toLocaleString('es-ES', { maximumFractionDigits: digits })} ${unit}`;
  };
  if (seconds >= 1e9 * YEAR) return f(seconds / (1e9 * YEAR), 'mil millones de años');
  if (seconds >= 1e6 * YEAR) return f(seconds / (1e6 * YEAR), 'millones de años');
  if (seconds >= YEAR) return f(seconds / YEAR, 'años');
  if (seconds >= 86400) return f(seconds / 86400, 'días');
  if (seconds >= 3600) return f(seconds / 3600, 'horas');
  if (seconds >= 60) return f(seconds / 60, 'minutos');
  if (seconds >= 1) return f(seconds, 's');
  const small: [number, string][] = [
    [1e-3, 'ms'],
    [1e-6, 'µs'],
    [1e-9, 'ns'],
    [1e-12, 'ps'],
    [1e-15, 'fs'],
    [1e-18, 'as'],
    [1e-21, 'zs'],
    [1e-24, 'ys'],
  ];
  for (const [scale, unit] of small) if (seconds >= scale) return f(seconds / scale, unit);
  return `${seconds.toExponential(1).replace('.', ',')} s`;
}
