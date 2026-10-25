import { AU_TIME_S, C_AU, ELECTRON_MASS_U, PROTON_MASS_U, RYDBERG_INF_PER_M } from './constants';
import { radial, radialCutoff } from './radial';

/**
 * Hidrógeno (y átomos de un electrón): niveles, fórmula de Rydberg y
 * probabilidades de transición. Modelo no relativista: sin estructura fina
 * ni desplazamiento de Lamb (ver README, «Limitaciones del modelo»).
 */

export const SERIES_NAMES: Record<number, string> = {
  1: 'Lyman',
  2: 'Balmer',
  3: 'Paschen',
  4: 'Brackett',
  5: 'Pfund',
  6: 'Humphreys',
};

/** Masa reducida en unidades de la masa del electrón: μ/mₑ = 1/(1 + mₑ/M) */
export const reducedMassFactor = (nuclearMassU = PROTON_MASS_U): number => 1 / (1 + ELECTRON_MASS_U / nuclearMassU);

/** Número de onda (m⁻¹) de la transición n₂ → n₁ con la constante de Rydberg corregida por masa reducida */
export function rydbergWavenumber(nLower: number, nUpper: number, z = 1, nuclearMassU = PROTON_MASS_U): number {
  if (nUpper <= nLower) throw new Error('n superior debe ser mayor que n inferior');
  return RYDBERG_INF_PER_M * reducedMassFactor(nuclearMassU) * z * z * (1 / (nLower * nLower) - 1 / (nUpper * nUpper));
}

/** Longitud de onda en el vacío, en nm */
export const vacuumWavelengthNm = (nLower: number, nUpper: number, z = 1, nuclearMassU = PROTON_MASS_U): number =>
  1e9 / rydbergWavenumber(nLower, nUpper, z, nuclearMassU);

/**
 * Vacío → aire con el índice de refracción del aire estándar de Peck y Reeder (1972),
 * la fórmula que usa NIST entre 200 y 2000 nm. Fuera de ese rango se devuelve el valor en vacío.
 */
export function vacuumToAirNm(vacNm: number): number {
  if (vacNm < 200 || vacNm > 2000) return vacNm;
  const s2 = (1000 / vacNm) ** 2; // (1/λ en µm)²
  const nMinus1 = (8060.51 + 2480990 / (132.274 - s2) + 17455.7 / (39.32957 - s2)) * 1e-8;
  return vacNm / (1 + nMinus1);
}

/** Longitud de onda «como en las tablas»: en aire entre 200 y 2000 nm, en vacío fuera */
export const tableWavelengthNm = (nLower: number, nUpper: number, z = 1, nuclearMassU = PROTON_MASS_U): number =>
  vacuumToAirNm(vacuumWavelengthNm(nLower, nUpper, z, nuclearMassU));

/** Energía del nivel n en eV (negativa: ligado) */
export const levelEnergyEv = (n: number, z = 1, nuclearMassU = PROTON_MASS_U): number =>
  (-13.605693122994 * reducedMassFactor(nuclearMassU) * z * z) / (n * n);

/** Integral radial dipolar ⟨n'l'|r|nl⟩ = ∫ R_n'l' · r · R_nl · r² dr (a₀, Z = 1), por Simpson */
export function radialDipole(n1: number, l1: number, n2: number, l2: number): number {
  const rMax = Math.max(radialCutoff(n1), radialCutoff(n2));
  const N = 20000; // par
  const h = rMax / N;
  let sum = 0;
  for (let i = 0; i <= N; i++) {
    const r = i * h;
    const f = radial(n1, l1, r) * radial(n2, l2, r) * r * r * r;
    sum += f * (i === 0 || i === N ? 1 : i % 2 ? 4 : 2);
  }
  return (sum * h) / 3;
}

/**
 * Coeficiente de Einstein A (s⁻¹) para nl → n'l' en un átomo de un electrón, sumado a los m finales:
 *   A = (4ω³ / 3c³) · (l_max / (2l+1)) · |⟨n'l'|r|nl⟩|²   (unidades atómicas)
 * Solo Δl = ±1 (dipolo eléctrico). Con masa reducida A escala como μ y con la
 * carga nuclear como Z⁴ (ω ∝ Z², r ∝ 1/Z), así que las ramificaciones no dependen de Z.
 */
export function einsteinA(n: number, l: number, nLow: number, lLow: number, nuclearMassU = PROTON_MASS_U, z = 1): number {
  if (Math.abs(l - lLow) !== 1 || nLow >= n || lLow >= nLow) return 0;
  const mu = reducedMassFactor(nuclearMassU);
  const omega = 0.5 * (1 / (nLow * nLow) - 1 / (n * n)); // hartree, masa infinita
  const d = radialDipole(n, l, nLow, lLow);
  const aAu = ((4 * omega ** 3) / (3 * C_AU ** 3)) * (Math.max(l, lLow) / (2 * l + 1)) * d * d;
  return (aAu / AU_TIME_S) * mu * z ** 4;
}

export interface Decay {
  n: number;
  l: number;
  /** Coeficiente A (s⁻¹) */
  rate: number;
  branching: number;
}

/** Todas las desexcitaciones permitidas de nl, con su probabilidad relativa */
export function decayChannels(n: number, l: number, nuclearMassU = PROTON_MASS_U, z = 1): Decay[] {
  const out: Decay[] = [];
  for (let nLow = 1; nLow < n; nLow++) {
    for (const lLow of [l - 1, l + 1]) {
      if (lLow < 0 || lLow >= nLow) continue;
      const rate = einsteinA(n, l, nLow, lLow, nuclearMassU, z);
      if (rate > 0) out.push({ n: nLow, l: lLow, rate, branching: 0 });
    }
  }
  const total = out.reduce((s, d) => s + d.rate, 0);
  for (const d of out) d.branching = d.rate / total;
  return out;
}

/** Vida media del estado nl (s); Infinity si no puede decaer por un fotón (1s y 2s) */
export function lifetime(n: number, l: number, nuclearMassU = PROTON_MASS_U, z = 1): number {
  const total = decayChannels(n, l, nuclearMassU, z).reduce((s, d) => s + d.rate, 0);
  return total > 0 ? 1 / total : Infinity;
}

const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η'];

/** Nombre de la línea: «Balmer Hα», «Lyman Ly-β», «Paschen Pa-α»… */
export function lineName(nLower: number, nUpper: number): string {
  const series = SERIES_NAMES[nLower] ?? `n = ${nLower}`;
  const letter = GREEK[nUpper - nLower - 1];
  if (!letter) return series;
  const prefix: Record<number, string> = { 1: 'Ly-', 2: 'H', 3: 'Pa-', 4: 'Br-', 5: 'Pf-', 6: 'Hu-' };
  return `${series} ${prefix[nLower] ?? ''}${letter}`;
}

/** Masa nuclear (u) a partir de la masa atómica del isótopo: se restan los Z electrones */
export const nuclearMassFromAtomic = (atomicMassU: number, z: number): number => atomicMassU - z * ELECTRON_MASS_U;
