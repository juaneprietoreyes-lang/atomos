import { describe, expect, it } from 'vitest';
import { maxHarmonicSquared, realHarmonic } from '../../src/physics/harmonics';

/** ∫ f dΩ con Gauss–Legendre en cos θ sería más fino; con 400×800 puntos medios basta */
function sphereIntegral(f: (theta: number, phi: number) => number, nt = 400, np = 800): number {
  let s = 0;
  for (let i = 0; i < nt; i++) {
    const theta = ((i + 0.5) * Math.PI) / nt;
    const w = Math.sin(theta) * (Math.PI / nt) * ((2 * Math.PI) / np);
    for (let j = 0; j < np; j++) s += f(theta, ((j + 0.5) * 2 * Math.PI) / np) * w;
  }
  return s;
}

const LM: [number, number][] = [];
for (let l = 0; l <= 3; l++) for (let m = -l; m <= l; m++) LM.push([l, m]);

describe('armónicos esféricos reales', () => {
  it('están normalizados: ∫Y² dΩ = 1 (l ≤ 3)', () => {
    for (const [l, m] of LM) expect(sphereIntegral((t, p) => realHarmonic(l, m, t, p) ** 2), `${l},${m}`).toBeCloseTo(1, 4);
  });

  it('son ortogonales entre sí', () => {
    for (let i = 0; i < LM.length; i++)
      for (let j = i + 1; j < LM.length; j++) {
        const [l1, m1] = LM[i];
        const [l2, m2] = LM[j];
        const v = sphereIntegral((t, p) => realHarmonic(l1, m1, t, p) * realHarmonic(l2, m2, t, p), 200, 400);
        expect(Math.abs(v), `${l1}${m1}·${l2}${m2}`).toBeLessThan(1e-3);
      }
  });

  it('p_z = √(3/4π)·cos θ y p_x tiene su lóbulo positivo en +x', () => {
    expect(realHarmonic(1, 0, 0, 0)).toBeCloseTo(Math.sqrt(3 / (4 * Math.PI)), 12);
    expect(realHarmonic(1, 1, Math.PI / 2, 0)).toBeGreaterThan(0);
    expect(realHarmonic(1, -1, Math.PI / 2, Math.PI / 2)).toBeGreaterThan(0);
  });

  it('d_z² se anula en el cono nodal θ = arccos(1/√3) ≈ 54,7°', () => {
    expect(Math.abs(realHarmonic(2, 0, Math.acos(1 / Math.sqrt(3)), 1.234))).toBeLessThan(1e-12);
    // y es negativo en el ecuador: el «anillo» tiene fase opuesta a los lóbulos
    expect(realHarmonic(2, 0, Math.PI / 2, 0)).toBeLessThan(0);
  });

  it('la cota de Y² para el muestreo es al menos el valor en los polos', () => {
    expect(maxHarmonicSquared(2, 0)).toBeGreaterThanOrEqual(realHarmonic(2, 0, 0, 0) ** 2 - 1e-12);
  });
});
