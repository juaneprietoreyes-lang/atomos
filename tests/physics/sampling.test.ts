import { describe, expect, it } from 'vitest';
import { meanRadius } from '../../src/physics/radial';
import { sampleOrbital } from '../../src/physics/sampling';

const N = 60000;

function radii(p: Float32Array): Float64Array {
  const out = new Float64Array(p.length / 3);
  for (let i = 0; i < out.length; i++) out[i] = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
  return out;
}
const fraction = (r: Float64Array, a: number, b: number) => r.filter((x) => x >= a && x < b).length / r.length;

describe('muestreo Monte Carlo de |ψ|²', () => {
  it('⟨r⟩ de las muestras ≈ (3n² − l(l+1))/2', () => {
    for (const [n, l, m] of [
      [1, 0, 0],
      [2, 1, 0],
      [3, 2, 1],
      [4, 3, -2],
    ]) {
      const r = radii(sampleOrbital(n, l, m, N).positions);
      const mean = r.reduce((s, x) => s + x, 0) / r.length;
      expect(mean / meanRadius(n, l), `${n}${l}${m}`).toBeGreaterThan(0.985);
      expect(mean / meanRadius(n, l), `${n}${l}${m}`).toBeLessThan(1.015);
    }
  });

  it('el 2s deja vacía su esfera nodal (r = 2 a₀)', () => {
    const r = radii(sampleOrbital(2, 0, 0, N).positions);
    expect(fraction(r, 1.95, 2.05)).toBeLessThan(0.0005);
    expect(fraction(r, 4.9, 5.1)).toBeGreaterThan(0.01);
  });

  it('el 3p tiene su nodo radial en r = 6 a₀', () => {
    const r = radii(sampleOrbital(3, 1, 0, N).positions);
    expect(fraction(r, 5.93, 6.07)).toBeLessThan(0.0005);
    expect(fraction(r, 11.9, 12.1)).toBeGreaterThan(0.005);
  });

  it('p_z: ⟨cos²θ⟩ = 3/5', () => {
    const p = sampleOrbital(2, 1, 0, N).positions;
    let s = 0;
    for (let i = 0; i < N; i++) {
      const r = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      s += (p[i * 3 + 2] / r) ** 2;
    }
    expect(s / N).toBeCloseTo(0.6, 2);
  });

  it('d_z²: el anillo ecuatorial (|cos θ| < 1/√3) lleva el 38,5 % y el cono nodal queda vacío', () => {
    const p = sampleOrbital(3, 2, 0, N).positions;
    const c0 = 1 / Math.sqrt(3);
    let ring = 0;
    let cone = 0;
    for (let i = 0; i < N; i++) {
      const r = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      const c = Math.abs(p[i * 3 + 2] / r);
      if (c < c0) ring++;
      if (Math.abs(c - c0) < 0.005) cone++;
    }
    expect(ring / N).toBeCloseTo(0.3849, 2);
    // Uniforme daría 0,5 %; con el nodo, casi nada
    expect(cone / N).toBeLessThan(0.0004);
  });

  it('el signo de ψ: p_x positivo en +x y negativo en −x', () => {
    const { positions: p, signs } = sampleOrbital(2, 1, 1, 5000);
    for (let i = 0; i < 5000; i++) if (Math.abs(p[i * 3]) > 0.2) expect(signs[i]).toBe(Math.sign(p[i * 3]));
  });

  it('es reproducible: misma semilla, mismos puntos', () => {
    const a = sampleOrbital(4, 3, 0, 1000).positions;
    const b = sampleOrbital(4, 3, 0, 1000).positions;
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});
