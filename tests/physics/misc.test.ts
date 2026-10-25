import { describe, expect, it } from 'vitest';
import { nuclearRadiusFm, packNucleus } from '../../src/physics/nucleus';
import { wavelengthToRgb } from '../../src/physics/wavelength-color';

describe('color de la luz según λ', () => {
  it('656 nm es rojo, 486 nm cian-azulado y 589 nm amarillo-anaranjado', () => {
    const red = wavelengthToRgb(656);
    expect(red.r).toBeGreaterThan(0.8);
    expect(red.g).toBeLessThan(0.3);
    const cyan = wavelengthToRgb(486);
    expect(cyan.b).toBeGreaterThan(cyan.r);
    expect(cyan.g).toBeGreaterThan(cyan.r);
    const yellow = wavelengthToRgb(589);
    expect(yellow.r).toBeGreaterThan(yellow.b);
    expect(yellow.g).toBeGreaterThan(yellow.b);
  });

  it('marca UV e IR fuera del visible', () => {
    expect(wavelengthToRgb(121.6).region).toBe('UV');
    expect(wavelengthToRgb(1875).region).toBe('IR');
    expect(wavelengthToRgb(500).region).toBe('visible');
  });
});

describe('núcleo', () => {
  it('R = 1,2 fm · A^(1/3)', () => {
    expect(nuclearRadiusFm(1)).toBeCloseTo(1.2, 10);
    expect(nuclearRadiusFm(238)).toBeCloseTo(7.437, 2);
  });

  it('empaqueta Z protones y N neutrones sin solaparlos', () => {
    const { positions, isProton } = packNucleus(26, 30);
    expect(isProton.filter(Boolean)).toHaveLength(26);
    expect(isProton).toHaveLength(56);
    let minD = Infinity;
    for (let i = 0; i < 56; i++)
      for (let j = i + 1; j < 56; j++)
        minD = Math.min(
          minD,
          Math.hypot(positions[i * 3] - positions[j * 3], positions[i * 3 + 1] - positions[j * 3 + 1], positions[i * 3 + 2] - positions[j * 3 + 2]),
        );
    expect(minD).toBeGreaterThan(1.85);
  });
});
