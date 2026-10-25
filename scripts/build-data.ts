/**
 * Cruza las fuentes de data/raw/ y genera:
 *   src/data/elements.json  — los 118 elementos (esquema en src/data/types.ts)
 *   src/data/spectra.json   — líneas de emisión NIST del átomo neutro (visible)
 *   data/INFORME.md         — discrepancias entre fuentes, para revisarlas a mano
 *
 * Prioridad de fuentes:
 *   configuración y 1ª energía de ionización → NIST ASD (Z ≤ 108)
 *   configuración Z > 108 → PubChem (predicciones relativistas: Ds 6d8 7s2, Rg 6d9 7s2;
 *     Bowserinator aún trae la extrapolación antigua 6d9 7s1 / 6d10 7s1)
 *   estado → PubChem; si es una predicción, Bowserinator (recoge las más recientes:
 *     Cn líquido, Mewes et al. 2019; Og sólido, Smits et al. 2020) y se guarda la alternativa
 *   isótopos → IAEA/ENSDF; nombre en español → Wikidata
 *   masa, electronegatividad, radios, grupo, periodo, posición → Bowserinator (datos de
 *     Wikipedia; PubChem redondea algunas masas, p. ej. Li = 7)
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  formatConfiguration,
  madelungConfiguration,
  parseConfiguration,
  sameConfiguration,
  totalElectrons,
} from '../src/physics/configuration';
import type { Category, ElementData, Isotope, SpectraData, SpectralLine } from '../src/data/types';

const ROOT = join(import.meta.dirname, '..');
const RAW = join(ROOT, 'data', 'raw');
const MAX_LINES_PER_ELEMENT = 40;

interface Bowser {
  number: number;
  symbol: string;
  name: string;
  atomic_mass: number;
  category: string;
  group: number;
  period: number;
  block: 's' | 'p' | 'd' | 'f';
  xpos: number;
  ypos: number;
  phase: string;
  electron_configuration_semantic: string;
  electronegativity_pauling: number | null;
  ionization_energies: number[];
  atomic_radii: Record<string, number[] | null> | null;
}

/** CSV sencillo con comillas; NIST además envuelve cada celda como ="valor". */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') {
        cells.push(cur);
        cur = '';
      } else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.replace(/^="(.*)"$/, '$1').trim()));
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const CATEGORY_FROM_PUBCHEM: Record<string, Category> = {
  'Alkali metal': 'alcalino',
  'Alkaline earth metal': 'alcalinoterreo',
  'Transition metal': 'transicion',
  Lanthanide: 'lantanido',
  Actinide: 'actinido',
  'Post-transition metal': 'postransicion',
  Metalloid: 'metaloide',
  Nonmetal: 'no-metal',
  Halogen: 'halogeno',
  'Noble gas': 'gas-noble',
};

const HALF_LIFE_UNITS: Record<string, string> = {
  Y: 'a',
  D: 'd',
  H: 'h',
  M: 'min',
  S: 's',
  MS: 'ms',
  US: 'µs',
  NS: 'ns',
  PS: 'ps',
};

function halfLifeText(value: string, unit: string, operator: string): string {
  const u = HALF_LIFE_UNITS[unit.toUpperCase()] ?? unit;
  const [mant, exp] = value.toUpperCase().split('E');
  const sup = (s: string) =>
    s.replace(/^\+/, '').replace(/[-0-9]/g, (d) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(d)]);
  const num = (exp ? `${mant}·10${sup(exp)}` : mant).replace('.', ',');
  return `${operator ? operator + ' ' : ''}${num} ${u}`;
}

function buildIsotopes(rows: Record<string, string>[], z: number): Isotope[] {
  const all: Isotope[] = rows
    .filter((r) => Number(r.z) === z)
    .map((r) => {
      const stable = r.half_life === 'STABLE';
      const hl = Number(r.half_life_sec);
      const neutrons = Number(r.n);
      return {
        a: z + neutrons,
        neutrons,
        mass: Number(r.atomic_mass) / 1e6, // ENSDF da la masa en micro-u
        abundance: r.abundance === '' ? null : Number(r.abundance),
        stable,
        halfLifeSeconds: !stable && Number.isFinite(hl) && r.half_life_sec !== '' ? hl : null,
        halfLifeText: !stable && r.half_life ? halfLifeText(r.half_life, r.unit_hl, r.operator_hl) : null,
      };
    })
    .filter((i) => i.stable || i.abundance !== null || i.halfLifeSeconds !== null);

  const natural = all.filter((i) => i.abundance !== null).sort((a, b) => b.abundance! - a.abundance!);
  const radioactive = all
    .filter((i) => i.abundance === null && i.halfLifeSeconds !== null)
    .sort((a, b) => b.halfLifeSeconds! - a.halfLifeSeconds!);
  return [...natural, ...radioactive.slice(0, 4)].slice(0, 8);
}

function parseLines(csv: string): SpectralLine[] {
  const byWl = new Map<string, SpectralLine>();
  for (const r of parseCsv(csv)) {
    const nm = Number(r['obs_wl_air(nm)'] || r['ritz_wl_air(nm)']);
    const m = /^(\d+(?:\.\d+)?)/.exec(r.intens ?? '');
    if (!Number.isFinite(nm) || nm <= 0 || !m) continue;
    const intensity = Number(m[1]);
    if (intensity <= 0) continue;
    // Varias componentes de un mismo multiplete comparten la longitud observada
    const key = nm.toFixed(2);
    const prev = byWl.get(key);
    if (!prev || prev.intensity < intensity) byWl.set(key, { nm: Number(nm.toFixed(4)), intensity });
  }
  return [...byWl.values()]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, MAX_LINES_PER_ELEMENT)
    .sort((a, b) => a.nm - b.nm);
}

async function main(): Promise<void> {
  const bowser = (JSON.parse(await readFile(join(RAW, 'bowserinator.json'), 'utf8')) as { elements: Bowser[] })
    .elements;
  const pubchemTable = JSON.parse(await readFile(join(RAW, 'pubchem.json'), 'utf8')).Table;
  const pubCols: string[] = pubchemTable.Columns.Column;
  const pubchem = new Map<number, Record<string, string>>(
    pubchemTable.Row.map((r: { Cell: string[] }) => {
      const o = Object.fromEntries(pubCols.map((c, i) => [c, r.Cell[i]]));
      return [Number(o.AtomicNumber), o];
    }),
  );
  const nist = new Map(parseCsv(await readFile(join(RAW, 'nist-ie.csv'), 'utf8')).map((r) => [Number(r['At. num']), r]));
  const iaea = parseCsv(await readFile(join(RAW, 'iaea-ground-states.csv'), 'utf8'));
  const namesEs = new Map<number, string>();
  for (const r of parseCsv(await readFile(join(RAW, 'wikidata-es.csv'), 'utf8'))) {
    const z = Number(r.z);
    if (Number.isInteger(z) && z >= 1 && z <= 118 && !namesEs.has(z)) namesEs.set(z, r.es);
  }

  const report: string[] = [
    '# Informe de cruce de fuentes',
    '',
    'Generado por `npm run data:build`. Revisa aquí cada discrepancia entre fuentes; la columna «usado» indica el valor que entra en la app.',
    '',
  ];
  const section = (title: string, lines: string[]) => {
    report.push(`## ${title}`, '', ...(lines.length ? lines : ['Sin discrepancias.']), '');
  };
  const cfgDiffs: string[] = [];
  const enDiffs: string[] = [];
  const phaseDiffs: string[] = [];
  const massDiffs: string[] = [];
  const catDiffs: string[] = [];
  const exceptions: string[] = [];
  const missing: string[] = [];

  const elements: ElementData[] = [];
  for (let z = 1; z <= 118; z++) {
    const b = bowser[z - 1];
    const p = pubchem.get(z);
    const n = nist.get(z);
    if (!b || b.number !== z || !p) throw new Error(`Falta el elemento ${z}`);
    const name = namesEs.get(z);
    if (!name) throw new Error(`Sin nombre en español para Z=${z}`);

    // --- Configuración electrónica
    const fromNist = n?.['Ground Shells (a)'] ? parseConfiguration(n['Ground Shells (a)']) : null;
    const fromBowser = parseConfiguration(b.electron_configuration_semantic);
    const fromPubchem = parseConfiguration(p.ElectronConfiguration);
    const shells = fromNist ?? fromPubchem;
    if (totalElectrons(shells) !== z) throw new Error(`Configuración de Z=${z} con ${totalElectrons(shells)} electrones`);
    const others = fromNist
      ? ([
          ['Bowserinator', fromBowser],
          ['PubChem', fromPubchem],
        ] as const)
      : ([['Bowserinator', fromBowser]] as const);
    for (const [src, cfg] of others) {
      if (!sameConfiguration(cfg, shells))
        cfgDiffs.push(
          `- **${b.symbol}** (${z}): usado ${fromNist ? 'NIST' : 'PubChem'} \`${formatConfiguration(shells)}\` · ${src} \`${formatConfiguration(cfg)}\``,
        );
    }
    const madelungException = !sameConfiguration(shells, madelungConfiguration(z));
    if (madelungException)
      exceptions.push(`${b.symbol} \`${formatConfiguration(shells)}\` (Madelung: \`${formatConfiguration(madelungConfiguration(z))}\`)`);

    // --- Energía de ionización (NIST)
    let ionizationEnergy: ElementData['ionizationEnergy'] = null;
    if (n && n['Ionization Energy (eV)']) {
      const prefix = n.Prefix;
      ionizationEnergy = {
        eV: Number(n['Ionization Energy (eV)']),
        uncertainty: n['Uncertainty (b) (eV)'] ? Number(n['Uncertainty (b) (eV)']) : null,
        // NIST: [ ] = interpolación/extrapolación (semiempírica); ( ) = cálculo ab initio
        quality: prefix === '[' ? 'semiempírica' : prefix === '(' ? 'teórica' : 'medida',
      };
    } else missing.push(`${b.symbol}: 1ª energía de ionización (NIST no la tiene) → «desconocida»`);

    // --- Categoría
    const category = CATEGORY_FROM_PUBCHEM[p.GroupBlock];
    if (!category) throw new Error(`Categoría PubChem desconocida: ${p.GroupBlock}`);
    const categoryPredicted = b.category.startsWith('unknown');
    const bowserCat = b.category.replace(/^unknown, (probably|predicted to be) /, '');
    const coarse: Record<string, Category[]> = {
      'diatomic nonmetal': ['no-metal', 'halogeno'],
      'polyatomic nonmetal': ['no-metal'],
      'noble gas': ['gas-noble'],
      'alkali metal': ['alcalino'],
      'alkaline earth metal': ['alcalinoterreo'],
      metalloid: ['metaloide'],
      'post-transition metal': ['postransicion'],
      'transition metal': ['transicion'],
      lanthanide: ['lantanido'],
      actinide: ['actinido'],
    };
    if (!coarse[bowserCat]?.includes(category))
      catDiffs.push(`- **${b.symbol}**: usado PubChem «${p.GroupBlock}» · Bowserinator «${b.category}»`);

    // --- Estado a temperatura ambiente
    const stateMatch = /(Expected to be an? )?(Solid|Liquid|Gas)/i.exec(p.StandardState ?? '');
    const phaseMap = { solid: 'sólido', liquid: 'líquido', gas: 'gas' } as const;
    let phase: ElementData['phase'] = null;
    if (stateMatch) {
      const pub = phaseMap[stateMatch[2].toLowerCase() as keyof typeof phaseMap];
      const bow = phaseMap[b.phase.toLowerCase() as keyof typeof phaseMap];
      const predicted = Boolean(stateMatch[1]) || z >= 100;
      const value = predicted && bow ? bow : pub;
      const alternative = predicted && bow && bow !== pub ? pub : null;
      phase = { value, predicted, alternative };
      if (bow !== pub)
        phaseDiffs.push(`- **${b.symbol}**: usado «${value}» (predicho) · PubChem «${p.StandardState}» · Bowserinator «${b.phase}»`);
    } else missing.push(`${b.symbol}: estado → «desconocido»`);

    // --- Electronegatividad (Pauling)
    const en = b.electronegativity_pauling ?? null;
    const enPub = p.Electronegativity ? Number(p.Electronegativity) : null;
    const enDisagree = en !== null && enPub !== null && Math.abs(en - enPub) > 0.05;
    if ((en === null) !== (enPub === null) || enDisagree)
      enDiffs.push(`- **${b.symbol}**: usado Bowserinator ${en ?? '—'} · PubChem ${enPub ?? '—'}`);

    // --- Isótopos y masa
    const isotopes = buildIsotopes(iaea, z);
    if (!isotopes.length) missing.push(`${b.symbol}: sin isótopos con semivida conocida`);
    const natural = isotopes.some((i) => i.abundance !== null);
    const pubMass = p.AtomicMass ? Number(p.AtomicMass) : null;
    let atomicMass: number | null = b.atomic_mass;
    let bracketMassNumber: number | null = null;
    if (!natural && isotopes.length) {
      // Sin isótopos naturales: IUPAC da el número másico del más estable entre corchetes
      bracketMassNumber = isotopes[0].a;
      atomicMass = isotopes[0].mass;
      if (pubMass !== null && Math.round(pubMass) !== bracketMassNumber)
        massDiffs.push(
          `- **${b.symbol}**: usado [${bracketMassNumber}] (isótopo de mayor semivida en ENSDF) · PubChem ${pubMass}`,
        );
    } else {
      // Contraste con la media ponderada de las abundancias de ENSDF
      const nat = isotopes.filter((i) => i.abundance !== null);
      const sum = nat.reduce((s, i) => s + i.abundance!, 0);
      const weighted = nat.reduce((s, i) => s + i.abundance! * i.mass, 0) / sum;
      if (Math.abs(weighted - b.atomic_mass) > 0.005 || (pubMass !== null && Math.abs(pubMass - b.atomic_mass) > 0.01))
        massDiffs.push(
          `- **${b.symbol}**: usado ${b.atomic_mass} · media ENSDF ${weighted.toFixed(4)} · PubChem ${pubMass ?? '—'}`,
        );
    }

    const radii = b.atomic_radii ?? {};
    const r = (k: string) => radii[k]?.[0] ?? null;

    elements.push({
      z,
      symbol: b.symbol,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      nameEn: b.name,
      atomicMass,
      bracketMassNumber,
      configuration: {
        shells,
        text: formatConfiguration(shells),
        source: fromNist ? 'NIST' : 'PubChem',
        predicted: z >= 104,
        madelungException,
      },
      category,
      categoryPredicted,
      group: b.ypos <= 7 ? b.group : null,
      period: b.period,
      block: b.block,
      x: b.xpos,
      y: b.ypos,
      electronegativity: en,
      electronegativityAlt: enDisagree ? enPub : null,
      ionizationEnergy,
      radius: {
        calculated: r('calculated'),
        empirical: r('empirical'),
        covalent: r('covalent_single'),
        vanDerWaals: r('van_der_waals'),
      },
      phase,
      isotopes,
      defaultIsotope: 0,
    });
  }

  // --- Espectros NIST
  const spectra: SpectraData = {};
  const noIntensity: string[] = [];
  for (const file of (await readdir(join(RAW, 'nist-lines'))).sort()) {
    const symbol = file.replace(/\.csv$/, '');
    const lines = parseLines(await readFile(join(RAW, 'nist-lines', file), 'utf8'));
    if (lines.length) spectra[symbol] = lines;
    else noIntensity.push(symbol);
  }

  section('Configuraciones: NIST frente a otras fuentes', cfgDiffs);
  section('Excepciones a la regla de Madelung (configuración usada)', exceptions.map((e) => `- ${e}`));
  section('Categorías', catDiffs);
  section('Electronegatividad', enDiffs);
  section('Estado a temperatura ambiente', phaseDiffs);
  section('Masa atómica', massDiffs);
  section('Datos que se muestran como desconocidos', missing.map((m) => `- ${m}`));
  section('Espectros NIST', [
    `- Elementos con líneas con intensidad relativa: ${Object.keys(spectra).length}`,
    `- Con líneas pero sin intensidades (no se muestran): ${noIntensity.join(', ') || 'ninguno'}`,
  ]);

  await writeFile(
    join(ROOT, 'src', 'data', 'elements.json'),
    '[\n' + elements.map((e) => JSON.stringify(e)).join(',\n') + '\n]\n',
  );
  await writeFile(
    join(ROOT, 'src', 'data', 'spectra.json'),
    '{\n' +
      Object.entries(spectra)
        .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(',\n') +
      '\n}\n',
  );
  await writeFile(join(ROOT, 'data', 'INFORME.md'), report.join('\n'));
  console.log(`✓ ${elements.length} elementos · ${Object.keys(spectra).length} espectros · informe en data/INFORME.md`);
}

await main();
