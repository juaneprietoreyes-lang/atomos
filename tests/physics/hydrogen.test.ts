import { describe, expect, it } from 'vitest';
import { SPECTRA } from '../../src/data/loader';
import {
  decayChannels,
  einsteinA,
  levelEnergyEv,
  lifetime,
  tableWavelengthNm,
  vacuumWavelengthNm,
} from '../../src/physics/hydrogen';
import { ELECTRON_MASS_U } from '../../src/physics/constants';

describe('fórmula de Rydberg (con masa reducida)', () => {
  it('Balmer: Hα ≈ 656 nm y Hβ ≈ 486 nm', () => {
    expect(vacuumWavelengthNm(2, 3)).toBeCloseTo(656.47, 1);
    expect(tableWavelengthNm(2, 3)).toBeCloseTo(656.28, 1);
    expect(vacuumWavelengthNm(2, 4)).toBeCloseTo(486.27, 1);
    expect(tableWavelengthNm(2, 4)).toBeCloseTo(486.13, 1);
    expect(tableWavelengthNm(2, 5)).toBeCloseTo(434.05, 1);
  });

  it('coincide con las líneas medidas por NIST (en aire) a menos de 0,02 nm', () => {
    for (const nUp of [3, 4, 5, 6]) {
      const calc = tableWavelengthNm(2, nUp);
      const nearest = Math.min(...SPECTRA.H.map((l) => Math.abs(l.nm - calc)));
      expect(nearest, `n=${nUp}`).toBeLessThan(0.02);
    }
  });

  it('Lyman-α ≈ 121,57 nm y límite de Balmer ≈ 364,6 nm', () => {
    expect(vacuumWavelengthNm(1, 2)).toBeCloseTo(121.57, 1);
    expect(tableWavelengthNm(2, 1e6)).toBeCloseTo(364.6, 0);
  });

  it('desplazamiento isotópico del deuterio en Hα ≈ 0,18 nm', () => {
    const deuteron = 2.01410177812 - ELECTRON_MASS_U;
    const shift = tableWavelengthNm(2, 3) - tableWavelengthNm(2, 3, 1, deuteron);
    expect(shift).toBeGreaterThan(0.17);
    expect(shift).toBeLessThan(0.19);
  });

  it('energía del estado fundamental ≈ −13,598 eV', () => {
    expect(levelEnergyEv(1)).toBeCloseTo(-13.598, 3);
  });
});

describe('coeficientes de Einstein A del hidrógeno (valores NIST)', () => {
  const cases: [number, number, number, number, number][] = [
    [2, 1, 1, 0, 6.2649e8],
    [3, 1, 1, 0, 1.6725e8],
    [3, 1, 2, 0, 2.2449e7],
    [3, 0, 2, 1, 6.3143e6],
    [3, 2, 2, 1, 6.4651e7],
  ];
  for (const [n, l, n2, l2, ref] of cases) {
    it(`A(${n}${'spd'[l]} → ${n2}${'spd'[l2]}) ≈ ${ref.toExponential(4)} s⁻¹`, () => {
      expect(Math.abs(einsteinA(n, l, n2, l2) / ref - 1)).toBeLessThan(2e-3);
    });
  }

  it('vida media del 2p ≈ 1,596 ns', () => {
    expect(lifetime(2, 1) * 1e9).toBeCloseTo(1.596, 2);
  });

  it('el 2s no puede decaer emitiendo un solo fotón (metaestable)', () => {
    expect(decayChannels(2, 0)).toHaveLength(0);
    expect(lifetime(2, 0)).toBe(Infinity);
  });

  it('reglas de selección: solo Δl = ±1', () => {
    expect(einsteinA(3, 2, 1, 0)).toBe(0);
    expect(einsteinA(3, 0, 1, 0)).toBe(0);
  });

  it('ramificación del 3p: 88 % a 1s (Lyman-β) y 12 % a 2s (Hα)', () => {
    const ch = decayChannels(3, 1);
    expect(ch.find((c) => c.n === 1)!.branching).toBeCloseTo(0.882, 2);
    expect(ch.find((c) => c.n === 2)!.branching).toBeCloseTo(0.118, 2);
  });
});
