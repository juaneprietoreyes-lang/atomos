import { describe, expect, it } from 'vitest';
import { meanRadius, radial, radialCutoff, radialNodes } from '../../src/physics/radial';

/** ∫ f(r) dr por Simpson */
function integrate(f: (r: number) => number, a: number, b: number, n = 20000): number {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

describe('funciones radiales hidrogenoides', () => {
  for (const z of [1, 3.7]) {
    it(`están normalizadas: ∫R²r²dr = 1 para n ≤ 7 (Z = ${z})`, () => {
      for (let n = 1; n <= 7; n++)
        for (let l = 0; l < n; l++) {
          const norm = integrate((r) => (radial(n, l, r, z) * r) ** 2, 0, radialCutoff(n, z));
          expect(norm, `${n},${l}`).toBeCloseTo(1, 6);
        }
    });
  }

  it('son ortogonales para la misma l y distinta n', () => {
    const pairs = [
      [1, 2, 0],
      [2, 3, 1],
      [3, 4, 2],
      [4, 5, 3],
    ];
    for (const [n1, n2, l] of pairs) {
      const overlap = integrate((r) => radial(n1, l, r) * radial(n2, l, r) * r * r, 0, radialCutoff(n2));
      expect(Math.abs(overlap), `${n1}${l}·${n2}${l}`).toBeLessThan(1e-7);
    }
  });

  it('R₁₀(0) = 2·Z^(3/2)', () => {
    expect(radial(1, 0, 0, 1)).toBeCloseTo(2, 12);
    expect(radial(1, 0, 0, 4)).toBeCloseTo(16, 10);
  });

  it('tienen n − l − 1 nodos radiales', () => {
    for (let n = 1; n <= 7; n++) for (let l = 0; l < n; l++) expect(radialNodes(n, l).length, `${n},${l}`).toBe(n - l - 1);
  });

  it('nodos en las posiciones exactas: 2s en 2/Z, 3p en 6/Z, 3s en (9 ± 3√3)/2', () => {
    expect(radialNodes(2, 0)[0]).toBeCloseTo(2, 6);
    expect(radialNodes(2, 0, 2.5)[0]).toBeCloseTo(0.8, 6);
    expect(radialNodes(3, 1)[0]).toBeCloseTo(6, 6);
    const [a, b] = radialNodes(3, 0);
    expect(a).toBeCloseTo((9 - 3 * Math.sqrt(3)) / 2, 6);
    expect(b).toBeCloseTo((9 + 3 * Math.sqrt(3)) / 2, 6);
  });

  it('⟨r⟩ numérico coincide con (3n² − l(l+1))/2Z', () => {
    for (const [n, l] of [
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
      [6, 0],
    ]) {
      const mean = integrate((r) => r * (radial(n, l, r) * r) ** 2, 0, radialCutoff(n));
      expect(mean).toBeCloseTo(meanRadius(n, l), 5);
    }
  });
});
