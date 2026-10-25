import { describe, expect, it } from 'vitest';
import { NUCLIDES, stabilityOf } from '../../src/data/nuclides';
import { formatHalfLife, shakeIntensity } from '../../src/physics/stability';

describe('estabilidad de los núcleos (IAEA/ENSDF)', () => {
  it('carga los núcleos conocidos de Z = 1 a 118', () => {
    expect(NUCLIDES.length).toBeGreaterThan(3300);
    expect(new Set(NUCLIDES.map((r) => r[0])).size).toBe(118);
  });

  it('casos de referencia', () => {
    expect(stabilityOf(6, 6).kind).toBe('stable'); // ¹²C
    expect(stabilityOf(26, 30).kind).toBe('stable'); // ⁵⁶Fe
    const c14 = stabilityOf(6, 8);
    expect(c14.kind).toBe('radioactive');
    if (c14.kind === 'radioactive') {
      expect(c14.decay).toBe('B-');
      expect(c14.halfLifeSeconds! / (365.25 * 86400)).toBeCloseTo(5700, -2);
    }
    const tritium = stabilityOf(1, 2);
    expect(tritium.kind === 'radioactive' && tritium.decay).toBe('B-');
    expect(stabilityOf(43, 55).kind).toBe('radioactive'); // el tecnecio no tiene isótopos estables
    expect(stabilityOf(8, 40).kind).toBe('unobserved'); // ⁴⁸O no existe
  });

  it('el temblor crece al acortarse la semivida', () => {
    expect(shakeIntensity({ kind: 'stable' })).toBe(0);
    const u238 = shakeIntensity(stabilityOf(92, 146));
    const c14 = shakeIntensity(stabilityOf(6, 8));
    const c10 = shakeIntensity(stabilityOf(6, 4));
    expect(u238).toBeLessThan(c14);
    expect(c14).toBeLessThan(c10);
    expect(shakeIntensity({ kind: 'unobserved' })).toBe(1);
  });

  it('semividas legibles', () => {
    expect(formatHalfLife(5700 * 365.25 * 86400)).toBe('5700 años');
    expect(formatHalfLife(4.468e9 * 365.25 * 86400)).toBe('4,47 mil millones de años');
    expect(formatHalfLife(19.29)).toBe('19,3 s');
  });
});
