import { byZ } from './data/loader';
import type { ElementData, Isotope } from './data/types';
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
  return {
    element,
    isotope,
    shells,
    electrons,
    orbitals,
    exact: electrons === 1,
    protons: s.z,
    neutrons: isotope ? isotope.neutrons : 0,
  };
}
