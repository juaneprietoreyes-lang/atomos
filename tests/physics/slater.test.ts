import { describe, expect, it } from 'vitest';
import { byZ } from '../../src/data/loader';
import { zEffective } from '../../src/physics/slater';

const zeff = (z: number, n: number, l: number) => zEffective(z, byZ(z).configuration.shells, n, l);

describe('Z_eff con las reglas de Slater', () => {
  it('casos de libro', () => {
    expect(zeff(1, 1, 0)).toBeCloseTo(1.0, 10); // H 1s
    expect(zeff(2, 1, 0)).toBeCloseTo(1.7, 10); // He 1s
    expect(zeff(6, 2, 1)).toBeCloseTo(3.25, 10); // C 2p
    expect(zeff(11, 3, 0)).toBeCloseTo(2.2, 10); // Na 3s
    expect(zeff(19, 4, 0)).toBeCloseTo(2.2, 10); // K 4s
    expect(zeff(26, 3, 2)).toBeCloseTo(6.25, 10); // Fe 3d
    expect(zeff(26, 4, 0)).toBeCloseTo(3.75, 10); // Fe 4s
    expect(zeff(30, 3, 2)).toBeCloseTo(8.85, 10); // Zn 3d
    expect(zeff(30, 4, 0)).toBeCloseTo(4.35, 10); // Zn 4s
  });

  it('crece al bajar a capas internas y nunca supera Z', () => {
    const au = byZ(79);
    const z1s = zeff(79, 1, 0);
    expect(z1s).toBeLessThanOrEqual(79);
    expect(z1s).toBeGreaterThan(zeff(79, 5, 2));
    expect(zeff(79, 5, 2)).toBeGreaterThan(zeff(79, 6, 0));
    for (const s of au.configuration.shells) expect(zeff(79, s.n, s.l)).toBeGreaterThan(0);
  });

  it('da Z_eff positiva para todos los orbitales de los 118 elementos', () => {
    for (let z = 1; z <= 118; z++)
      for (const s of byZ(z).configuration.shells) expect(zeff(z, s.n, s.l), `Z=${z} ${s.n}${s.l}`).toBeGreaterThan(0);
  });
});
