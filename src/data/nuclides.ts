import nuclidesJson from './nuclides.json';
import { knownNeutronRange, makeLookup, type NuclideRow } from '../physics/stability';

export const NUCLIDES = nuclidesJson as NuclideRow[];
export const stabilityOf = makeLookup(NUCLIDES);
export const neutronRange = (z: number) => knownNeutronRange(NUCLIDES, z);
