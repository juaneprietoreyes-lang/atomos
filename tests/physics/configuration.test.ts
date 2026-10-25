import { describe, expect, it } from 'vitest';
import { byZ } from '../../src/data/loader';
import {
  formatConfiguration,
  ionConfiguration,
  madelungConfiguration,
  orbitalOccupations,
  parseConfiguration,
} from '../../src/physics/configuration';
import { occupiedOrbitals } from '../../src/physics/orbitals';

const ion = (z: number, charge: number) => formatConfiguration(ionConfiguration(byZ(z).configuration.shells, charge));

describe('lectura de configuraciones', () => {
  it('entiende los formatos de NIST, Bowserinator y PubChem', () => {
    expect(formatConfiguration(parseConfiguration('[Ar].3d5.4s'))).toBe('[Ar] 3d5 4s1');
    expect(formatConfiguration(parseConfiguration('[Xe] 5d16s2'))).toBe('[Xe] 5d1 6s2');
    expect(formatConfiguration(parseConfiguration('[Ar]4s1 3d10'))).toBe('[Ar] 3d10 4s1');
    expect(formatConfiguration(parseConfiguration('[Rn]7s2 7p6 5f14 6d10 (predicted)'))).toBe('[Rn] 5f14 6d10 7s2 7p6');
    expect(formatConfiguration(parseConfiguration('[Hg].6p2'))).toBe('[Xe] 4f14 5d10 6s2 6p2');
  });

  it('Madelung predice bien los casos normales', () => {
    expect(formatConfiguration(madelungConfiguration(26))).toBe('[Ar] 3d6 4s2');
    expect(formatConfiguration(madelungConfiguration(118))).toBe('[Rn] 5f14 6d10 7s2 7p6');
  });
});

describe('iones', () => {
  it('cationes: primero salen los electrones de mayor n (4s antes que 3d)', () => {
    expect(ion(26, 2)).toBe('[Ar] 3d6'); // Fe²⁺
    expect(ion(26, 3)).toBe('[Ar] 3d5'); // Fe³⁺
    expect(ion(29, 1)).toBe('[Ar] 3d10'); // Cu⁺
    expect(ion(11, 1)).toBe('[He] 2s2 2p6'); // Na⁺ = configuración del Ne
    expect(ion(58, 3)).toBe('[Xe] 4f1'); // Ce³⁺
    expect(ion(92, 3)).toBe('[Rn] 5f3'); // U³⁺
  });

  it('aniones: se completan siguiendo Madelung', () => {
    expect(ion(17, -1)).toBe('[Ne] 3s2 3p6'); // Cl⁻ = configuración del Ar
    expect(ion(8, -2)).toBe('[He] 2s2 2p6'); // O²⁻
    expect(ion(1, -1)).toBe('1s2'); // H⁻
  });

  it('se puede llegar al núcleo desnudo', () => {
    expect(ionConfiguration(byZ(3).configuration.shells, 3)).toEqual([]);
  });
});

describe('ocupación de orbitales', () => {
  it('Hund: primero desapareados, luego se aparean', () => {
    expect(orbitalOccupations(1, 2, 'hund')).toEqual([1, 1, 0]);
    expect(orbitalOccupations(1, 4, 'hund')).toEqual([2, 1, 1]);
    expect(orbitalOccupations(2, 6, 'hund')).toEqual([2, 1, 1, 1, 1]);
    expect(orbitalOccupations(3, 14, 'hund')).toEqual([2, 2, 2, 2, 2, 2, 2]);
  });

  it('promedio esférico: reparto uniforme', () => {
    const occ = orbitalOccupations(1, 2, 'spherical');
    occ.forEach((o) => expect(o).toBeCloseTo(2 / 3, 12));
  });

  it('carbono: 1s², 2s², 2p_z¹, 2p_x¹', () => {
    const orbs = occupiedOrbitals(6, byZ(6).configuration.shells, 'hund');
    expect(orbs.map((o) => `${o.label}:${o.occupancy}`)).toEqual(['1s:2', '2s:2', '2p_z:1', '2p_x:1']);
  });

  it('el oro tiene 40 orbitales ocupados y suma 79 electrones', () => {
    const orbs = occupiedOrbitals(79, byZ(79).configuration.shells, 'hund');
    expect(orbs).toHaveLength(40);
    expect(orbs.reduce((s, o) => s + o.occupancy, 0)).toBe(79);
  });
});
