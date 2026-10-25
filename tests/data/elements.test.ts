import { describe, expect, it } from 'vitest';
import { ELEMENTS, SPECTRA } from '../../src/data/loader';
import { formatConfiguration, totalElectrons } from '../../src/physics/configuration';

describe('dataset de los 118 elementos', () => {
  it('tiene los 118, en orden y sin repetir', () => {
    expect(ELEMENTS).toHaveLength(118);
    ELEMENTS.forEach((e, i) => expect(e.z).toBe(i + 1));
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    expect(new Set(ELEMENTS.map((e) => `${e.x},${e.y}`)).size).toBe(118);
  });

  it('cada configuración tiene Z electrones', () => {
    for (const e of ELEMENTS) expect(totalElectrons(e.configuration.shells), e.symbol).toBe(e.z);
  });

  it('todos tienen nombre en español, masa y al menos un isótopo', () => {
    for (const e of ELEMENTS) {
      expect(e.name.length, e.symbol).toBeGreaterThan(1);
      expect(e.atomicMass, e.symbol).not.toBeNull();
      expect(e.isotopes.length, e.symbol).toBeGreaterThan(0);
    }
    expect(ELEMENTS[0].name).toBe('Hidrógeno');
    expect(ELEMENTS[117].name).toBe('Oganesón');
    expect(ELEMENTS[116].name).toBe('Teneso');
  });

  it('lantánidos y actínidos van en sus filas aparte (9 y 10)', () => {
    for (let z = 57; z <= 71; z++) expect(ELEMENTS[z - 1].y).toBe(9);
    for (let z = 89; z <= 103; z++) expect(ELEMENTS[z - 1].y).toBe(10);
  });
});

describe('configuraciones con las excepciones reales a Madelung (NIST)', () => {
  const cases: [string, string][] = [
    ['Cr', '[Ar] 3d5 4s1'],
    ['Cu', '[Ar] 3d10 4s1'],
    ['Nb', '[Kr] 4d4 5s1'],
    ['Mo', '[Kr] 4d5 5s1'],
    ['Ru', '[Kr] 4d7 5s1'],
    ['Rh', '[Kr] 4d8 5s1'],
    ['Pd', '[Kr] 4d10'],
    ['Ag', '[Kr] 4d10 5s1'],
    ['Pt', '[Xe] 4f14 5d9 6s1'],
    ['Au', '[Xe] 4f14 5d10 6s1'],
    ['La', '[Xe] 5d1 6s2'],
    ['Ce', '[Xe] 4f1 5d1 6s2'],
    ['Gd', '[Xe] 4f7 5d1 6s2'],
    ['Ac', '[Rn] 6d1 7s2'],
    ['Th', '[Rn] 6d2 7s2'],
    ['U', '[Rn] 5f3 6d1 7s2'],
    ['Lr', '[Rn] 5f14 7s2 7p1'],
  ];
  for (const [symbol, expected] of cases) {
    it(`${symbol} = ${expected}`, () => {
      const e = ELEMENTS.find((x) => x.symbol === symbol)!;
      expect(formatConfiguration(e.configuration.shells)).toBe(expected);
      expect(e.configuration.madelungException).toBe(true);
    });
  }

  it('los que siguen a Madelung no se marcan como excepción', () => {
    for (const s of ['Fe', 'Zn', 'Na', 'Cl', 'Hg', 'Og'])
      expect(ELEMENTS.find((x) => x.symbol === s)!.configuration.madelungException, s).toBe(false);
  });
});

describe('marcas de datos inciertos', () => {
  it('Z ≥ 104 lleva la configuración marcada como predicha', () => {
    for (const e of ELEMENTS) expect(e.configuration.predicted, e.symbol).toBe(e.z >= 104);
  });

  it('la energía de ionización de los superpesados sin dato es null, no inventada', () => {
    for (let z = 109; z <= 118; z++) expect(ELEMENTS[z - 1].ionizationEnergy).toBeNull();
  });

  it('valores de referencia de NIST', () => {
    expect(ELEMENTS[0].ionizationEnergy!.eV).toBeCloseTo(13.598434, 5);
    expect(ELEMENTS[10].ionizationEnergy!.eV).toBeCloseTo(5.139, 3);
  });

  it('sin isótopos naturales → masa entre corchetes', () => {
    expect(ELEMENTS[42].bracketMassNumber).not.toBeNull(); // Tc
    expect(ELEMENTS[60].bracketMassNumber).not.toBeNull(); // Pm
    expect(ELEMENTS[25].bracketMassNumber).toBeNull(); // Fe
    expect(ELEMENTS[91].bracketMassNumber).toBeNull(); // U es natural
  });

  it('isótopo por defecto: el más abundante', () => {
    const cl = ELEMENTS[16];
    expect(cl.isotopes[cl.defaultIsotope].a).toBe(35);
    const fe = ELEMENTS[25];
    expect(fe.isotopes[fe.defaultIsotope].a).toBe(56);
    const u = ELEMENTS[91];
    expect(u.isotopes[u.defaultIsotope].a).toBe(238);
  });
});

describe('espectros NIST', () => {
  it('Hα del hidrógeno aparece en 656,28 nm (aire)', () => {
    expect(SPECTRA.H.some((l) => Math.abs(l.nm - 656.28) < 0.02)).toBe(true);
  });
  it('el doblete D del sodio (589,0 y 589,6 nm)', () => {
    expect(SPECTRA.Na.some((l) => Math.abs(l.nm - 588.995) < 0.01)).toBe(true);
    expect(SPECTRA.Na.some((l) => Math.abs(l.nm - 589.592) < 0.01)).toBe(true);
  });
  it('no hay espectros inventados para elementos sin datos', () => {
    expect(SPECTRA.Og).toBeUndefined();
    expect(SPECTRA.At).toBeUndefined();
  });
});
