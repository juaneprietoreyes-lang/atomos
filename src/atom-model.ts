import { byZ } from './data/loader';
import { stabilityOf } from './data/nuclides';
import type { ElementData, Isotope } from './data/types';
import type { Stability } from './physics/stability';
import { ionConfiguration, subshellLabel, totalElectrons, type Subshell } from './physics/configuration';
import { orbitalName } from './physics/harmonics';
import { radialScale, occupiedOrbitals, type OrbitalSpec } from './physics/orbitals';
import type { AppState } from './state';

/** Todo lo que se deriva del estado para dibujar y describir el átomo actual */
export interface AtomModel {
  element: ElementData;
  isotope: Isotope | undefined;
  shells: Subshell[];
  electrons: number;
  orbitals: OrbitalSpec[];
  /** Un solo electrón: el modelo hidrogenoide es exacto (no relativista) */
  exact: boolean;
  protons: number;
  neutrons: number;
  /** Número másico A = Z + N del núcleo dibujado */
  massNumber: number;
  /** Masa atómica (u) del núcleo dibujado: la medida si es un isótopo de la ficha; si no, ≈ A */
  atomicMassU: number;
  /** El núcleo dibujado coincide con uno de los isótopos de la ficha */
  isotopeMatches: boolean;
  stability: Stability;
}

export function computeAtom(s: AppState): AtomModel {
  const element = byZ(s.z);
  const isotope = element.isotopes[s.isotopeIndex] ?? element.isotopes[0];
  const shells = s.charge === 0 ? element.configuration.shells : ionConfiguration(element.configuration.shells, s.charge);
  const electrons = totalElectrons(shells);
  let orbitals = occupiedOrbitals(s.z, shells, s.occupancy);
  // Átomo de un electrón excitado: su único orbital pasa a ser el nlm elegido
  if (electrons === 1 && s.excited) {
    const { n, l, m } = s.excited;
    const sub = subshellLabel(n, l);
    orbitals = [
      {
        n,
        l,
        m,
        subshell: sub,
        label: l === 0 ? sub : `${n}${orbitalName(l, m)}`,
        occupancy: 1,
        zEff: s.z,
        scale: radialScale(n, l, s.z, true),
      },
    ];
  }
  const neutrons = s.neutrons ?? (isotope ? isotope.neutrons : 0);
  return {
    element,
    isotope,
    shells,
    electrons,
    orbitals,
    exact: electrons === 1,
    protons: s.z,
    neutrons,
    massNumber: s.z + neutrons,
    atomicMassU: element.isotopes.find((i) => i.neutrons === neutrons)?.mass ?? s.z + neutrons,
    isotopeMatches: s.neutrons === null || isotope?.neutrons === s.neutrons,
    stability: stabilityOf(s.z, neutrons),
  };
}
