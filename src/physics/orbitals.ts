import { orbitalOccupations, realMOrder, subshellLabel, type Subshell } from './configuration';
import { orbitalName } from './harmonics';
import { zEffective } from './slater';

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
}

export type OccupancyMode = 'hund' | 'spherical';

/**
 * Lista de orbitales reales ocupados de una configuración, cada uno con su Z_eff.
 * Con un solo electrón el modelo hidrogenoide es exacto y Z_eff = Z.
 */
export function occupiedOrbitals(z: number, shells: Subshell[], mode: OccupancyMode): OrbitalSpec[] {
  const out: OrbitalSpec[] = [];
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
      });
    });
  }
  return out;
}
