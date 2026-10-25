import { orbitalOccupations, realMOrder, subshellLabel, type Subshell } from './configuration';
import { orbitalName } from './harmonics';
import { meanRadius } from './radial';
import { zEffective } from './slater';

/**
 * n* efectivo de Slater. Para n = 7 Slater no dio valor: 4,3 es una extrapolación
 * (y 4,4 para el 8s de algún anión), documentada en el README.
 */
export const SLATER_N_STAR: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 3.7, 5: 4.0, 6: 4.2, 7: 4.3, 8: 4.4 };

/**
 * Factor de escala radial (a₀ por unidad reducida) de un orbital.
 *
 * Con un solo electrón el hidrogenoide es exacto: escala = 1/Z.
 * Con varios, el hidrogenoide con n entero y Z_eff exagera las capas externas
 * (el 6s del Cs saldría con ⟨r⟩ ≈ 24 a₀). Slater lo corregía con un n* menor;
 * aquí se conserva la forma hidrogenoide (con sus nodos) y se escala para que
 * ⟨r⟩ sea el de un orbital de Slater: ⟨r⟩ = n*(2n*+1)/(2 Z_eff).
 * Para l = n − 1 con n ≤ 3 ambos coinciden y el factor es exactamente 1/Z_eff.
 */
export function radialScale(n: number, l: number, zEff: number, singleElectron: boolean): number {
  if (singleElectron) return 1 / zEff;
  const ns = SLATER_N_STAR[n] ?? n;
  const target = (ns * (2 * ns + 1)) / (2 * zEff);
  return target / meanRadius(n, l, 1);
}

/** ⟨r⟩ del orbital tal como se dibuja, en a₀ */
export const displayedMeanRadius = (o: OrbitalSpec): number => meanRadius(o.n, o.l, 1) * o.scale;

export interface OrbitalSpec {
  n: number;
  l: number;
  m: number;
  /** «2p» */
  subshell: string;
  /** «2p_x» */
  label: string;
  /** Electrones en este orbital (0–2; fraccionario en el promedio esférico) */
  occupancy: number;
  zEff: number;
  /** a₀ por unidad reducida: posiciones muestreadas × scale = posiciones en a₀ */
  scale: number;
}

export type OccupancyMode = 'hund' | 'spherical';

/**
 * Lista de orbitales reales ocupados de una configuración, cada uno con su Z_eff.
 * Con un solo electrón el modelo hidrogenoide es exacto y Z_eff = Z.
 */
export function occupiedOrbitals(z: number, shells: Subshell[], mode: OccupancyMode): OrbitalSpec[] {
  const out: OrbitalSpec[] = [];
  const single = shells.reduce((s, x) => s + x.electrons, 0) === 1;
  for (const sh of shells) {
    if (sh.electrons <= 0) continue;
    const zEff = zEffective(z, shells, sh.n, sh.l);
    const occ = orbitalOccupations(sh.l, sh.electrons, mode);
    realMOrder(sh.l).forEach((m, i) => {
      if (occ[i] <= 0) return;
      const sub = subshellLabel(sh.n, sh.l);
      out.push({
        n: sh.n,
        l: sh.l,
        m,
        subshell: sub,
        label: sh.l === 0 ? sub : `${sh.n}${orbitalName(sh.l, m)}`,
        occupancy: occ[i],
        zEff,
        scale: radialScale(sh.n, sh.l, zEff, single),
      });
    });
  }
  return out;
}
