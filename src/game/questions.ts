import { CATEGORY_SINGULAR, ELEMENTS, byZ } from '../data/loader';
import { NUCLIDES } from '../data/nuclides';
import type { ElementData } from '../data/types';
import { formatConfiguration, MADELUNG_ORDER, madelungConfiguration, type Subshell } from '../physics/configuration';
import { lineName, tableWavelengthNm } from '../physics/hydrogen';
import { decayLabel, formatHalfLife } from '../physics/stability';
import { wavelengthToRgb } from '../physics/wavelength-color';
import type { AppState, Level } from '../state';

/**
 * Preguntas del modo juego. Todas salen de los mismos datos y la misma física que
 * el simulador: nada de respuestas escritas a mano.
 */
export type Answer = { type: 'table'; z: number } | { type: 'choice'; options: string[]; correct: number };

export interface Question {
  kind: string;
  /** Texto de la pregunta (HTML ya escapado) */
  prompt: string;
  answer: Answer;
  /** Explicación que se muestra tras responder (HTML ya escapado) */
  explain: string;
  /** Qué se ve en el visor mientras se responde */
  view: Partial<AppState>;
}

type Rand = () => number;

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
const sup = (s: string | number) => String(s).replace(/[0-9+-]/g, (c) => SUP[c]);
const ion = (symbol: string, charge: number) =>
  symbol + sup(`${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}`);
const pretty = (cfg: string) => cfg.replace(/(\d[spdf])(\d+)/g, (_, a: string, e: string) => a + sup(e));

const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)];

function shuffle<T>(r: Rand, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Opciones barajadas con la correcta dentro y sin repetidas */
function choice(r: Rand, correct: string, distractors: string[], count = 4): Answer {
  const unique = [...new Set(distractors.filter((d) => d !== correct))];
  const options = shuffle(r, [correct, ...shuffle(r, unique).slice(0, count - 1)]);
  return { type: 'choice', options, correct: options.indexOf(correct) };
}

const SIMPLE_POOL = [...Array.from({ length: 20 }, (_, i) => i + 1), 26, 29, 30, 35, 47, 50, 53, 79, 80, 82, 92];
const FULL_POOL = Array.from({ length: 92 }, (_, i) => i + 1);

const pool = (level: Level) => (level === 'sencillo' ? SIMPLE_POOL : FULL_POOL);
const el = (z: number): ElementData => byZ(z);
const article = (e: ElementData) => `el ${e.name.toLowerCase()}`;

function protonsToElement(r: Rand, level: Level): Question {
  const e = el(pick(r, pool(level)));
  return {
    kind: 'protones',
    prompt: `Este átomo tiene <strong>${e.z} protones</strong> en el núcleo. ¿Qué elemento es? <em>Tócalo en la tabla.</em>`,
    answer: { type: 'table', z: e.z },
    explain: `Es ${article(e)} (${e.symbol}). El número atómico Z es el número de protones, y cada elemento tiene el suyo: Z = ${e.z}.`,
    view: { z: e.z, charge: 0, neutrons: null, excited: null, hideIdentity: true },
  };
}

function findElement(r: Rand, level: Level): Question {
  const e = el(pick(r, level === 'sencillo' ? SIMPLE_POOL : ELEMENTS.map((x) => x.z)));
  const where =
    e.group !== null
      ? `está en el grupo ${e.group} y el periodo ${e.period}`
      : `está en la fila de los ${e.category === 'lantanido' ? 'lantánidos' : 'actínidos'}, que se pone aparte`;
  return {
    kind: 'buscar',
    prompt: `¿Dónde está <strong>${article(e)}</strong>? <em>Tócalo en la tabla.</em>`,
    answer: { type: 'table', z: e.z },
    explain: `El ${e.name.toLowerCase()} (${e.symbol}, Z = ${e.z}) ${where}.`,
    view: { z: e.z, charge: 0, neutrons: null, excited: null, hideIdentity: true },
  };
}

function neutronCount(r: Rand, level: Level): Question {
  const e = el(pick(r, pool(level).filter((z) => byZ(z).isotopes.length)));
  const iso = e.isotopes[0];
  const n = iso.neutrons;
  return {
    kind: 'neutrones',
    prompt: `¿Cuántos <strong>neutrones</strong> tiene el núcleo de ${sup(iso.a)}${e.symbol} (${e.name.toLowerCase()}-${iso.a})?`,
    answer: choice(r, String(n), [String(e.z), String(iso.a), String(n + 1), String(n - 1), String(n + 2)].filter((x) => Number(x) >= 0)),
    explain: `El número de arriba, ${iso.a}, es el número másico A = protones + neutrones. Como tiene Z = ${e.z} protones: N = ${iso.a} − ${e.z} = ${n}.`,
    view: { z: e.z, charge: 0, neutrons: n, excited: null, hideIdentity: false },
  };
}

const COMMON_IONS: [number, number][] = [
  [3, 1], [11, 1], [19, 1], [12, 2], [20, 2], [13, 3], [9, -1], [17, -1], [35, -1], [53, -1],
  [8, -2], [16, -2], [7, -3], [26, 2], [26, 3], [29, 2], [30, 2], [47, 1],
];

function ionElectrons(r: Rand): Question {
  const [z, charge] = pick(r, COMMON_IONS);
  const e = el(z);
  const correct = z - charge;
  const verb = charge > 0 ? 'perdido' : 'ganado';
  const k = Math.abs(charge);
  return {
    kind: 'iones',
    prompt: `¿Cuántos <strong>electrones</strong> tiene el ion ${ion(e.symbol, charge)}?`,
    answer: choice(r, String(correct), [String(z), String(z + charge), String(correct + 1), String(correct - 1)].filter((x) => Number(x) >= 0)),
    explain: `El ${e.name.toLowerCase()} tiene ${z} protones. La carga ${charge > 0 ? '+' : '−'}${k} significa que ha ${verb} ${k} electrón${k > 1 ? 'es' : ''}: ${z} ${charge > 0 ? '−' : '+'} ${k} = ${correct}.`,
    view: { z, charge, neutrons: null, excited: null, hideIdentity: false },
  };
}

function categoryOf(r: Rand, level: Level): Question {
  const e = el(pick(r, pool(level)));
  const correct = CATEGORY_SINGULAR[e.category];
  return {
    kind: 'tipo',
    prompt: `¿Qué tipo de elemento es <strong>${article(e)}</strong>?`,
    answer: choice(r, correct, Object.values(CATEGORY_SINGULAR)),
    explain: `El ${e.name.toLowerCase()} es un ${correct.toLowerCase()}. En la tabla, cada familia tiene su color: los del mismo grupo se parecen químicamente.`,
    view: { z: e.z, charge: 0, neutrons: null, excited: null, hideIdentity: true },
  };
}

/** Radiactivos conocidos para que la pregunta no sea siempre de núcleos rarísimos */
const FAMOUS_RADIOACTIVE: [number, number][] = [
  [1, 2], [6, 8], [19, 21], [27, 33], [38, 52], [53, 78], [55, 82], [86, 136], [88, 138], [92, 143], [92, 146], [94, 145], [43, 55],
];

function isStable(r: Rand, level: Level): Question {
  const maxZ = level === 'sencillo' ? 92 : 118;
  let z: number;
  let n: number;
  if (r() < 0.5) {
    const stable = NUCLIDES.filter((x) => x[2] === 0 && x[0] <= maxZ);
    [z, n] = pick(r, stable);
  } else if (r() < 0.6) {
    [z, n] = pick(r, FAMOUS_RADIOACTIVE);
  } else {
    const radio = NUCLIDES.filter((x) => x[2] !== 0 && x[2] !== null && x[0] <= maxZ && x[2]! > 1);
    [z, n] = pick(r, radio);
  }
  const e = el(z);
  const row = NUCLIDES.find((x) => x[0] === z && x[1] === n)!;
  const stable = row[2] === 0;
  const options = ['Sí, es estable', 'No, es radiactivo'];
  return {
    kind: 'estable',
    prompt: `¿Es estable el núcleo ${sup(z + n)}${e.symbol}, con ${z} protones y ${n} neutrones?`,
    answer: { type: 'choice', options, correct: stable ? 0 : 1 },
    explain: stable
      ? `Sí: el ${sup(z + n)}${e.symbol} es estable, no se desintegra nunca.`
      : `No: es radiactivo. Su semivida es ${formatHalfLife(row[2]!)} y se desintegra por ${decayLabel(row[3])}.`,
    view: { z, charge: 0, neutrons: n, excited: null, hideIdentity: true },
  };
}

/** Configuración con un electrón cambiado de sitio (también a la siguiente subcapa vacía): un distractor creíble */
function shuffledConfig(r: Rand, shells: Subshell[]): string {
  const copy = shells.map((s) => ({ ...s }));
  const next = MADELUNG_ORDER.find(({ n, l }) => !copy.some((s) => s.n === n && s.l === l));
  if (next) copy.push({ n: next.n, l: next.l, electrons: 0 });
  const from = pick(r, copy.filter((s) => s.electrons > 0));
  const targets = copy.filter((s) => s !== from && s.electrons < 2 * (2 * s.l + 1));
  if (!targets.length) return formatConfiguration(copy.filter((s) => s.electrons > 0));
  const to = pick(r, targets);
  from.electrons--;
  to.electrons++;
  return formatConfiguration(copy.filter((s) => s.electrons > 0));
}

function configurationOf(r: Rand): Question {
  const exceptions = ELEMENTS.filter((e) => e.configuration.madelungException && e.z <= 100);
  const e = r() < 0.45 ? pick(r, exceptions) : el(pick(r, Array.from({ length: 54 }, (_, i) => i + 3)));
  const correct = e.configuration.text;
  const madelung = formatConfiguration(madelungConfiguration(e.z));
  const distractors = [madelung];
  for (let i = 0; i < 12 && new Set(distractors.filter((d) => d !== correct)).size < 3; i++)
    distractors.push(shuffledConfig(r, e.configuration.shells));
  const ans = choice(r, correct, distractors);
  return {
    kind: 'configuración',
    prompt: `¿Cuál es la configuración electrónica real del <strong>${e.name.toLowerCase()}</strong> (Z = ${e.z})?`,
    answer: { ...ans, options: (ans as { options: string[] }).options.map(pretty) } as Answer,
    explain: e.configuration.madelungException
      ? `${pretty(correct)}. ¡Trampa! Es una excepción: la regla de Madelung diría ${pretty(madelung)}, pero lo medido (NIST) es otra cosa.`
      : `${pretty(correct)}, siguiendo el orden de llenado de Madelung.`,
    view: { z: e.z, charge: 0, neutrons: null, excited: null, hideIdentity: true },
  };
}

const SHAPES = ['s (esférico)', 'p (dos lóbulos)', 'd (cuatro lóbulos o anillo)', 'f (seis u ocho lóbulos)'];

function orbitalShape(r: Rand): Question {
  const l = Math.floor(r() * 4);
  const n = l + 1 + (r() < 0.4 ? 1 : 0);
  const m = Math.floor(r() * (2 * l + 1)) - l;
  return {
    kind: 'orbital',
    prompt: '¿Qué tipo de orbital ves en el visor? <em>Gíralo para verlo bien.</em>',
    answer: { type: 'choice', options: SHAPES, correct: l },
    explain: `Es un orbital ${'spdf'[l]} (l = ${l}) del hidrógeno, con n = ${n}. ${
      n - l - 1 > 0 ? `Tiene además ${n - l - 1} nodo${n - l - 1 > 1 ? 's' : ''} esférico${n - l - 1 > 1 ? 's' : ''} (capas vacías).` : ''
    } Cuantos más lóbulos, mayor es l.`,
    view: { z: 1, charge: 0, neutrons: null, excited: n === 1 ? null : { n, l, m }, phase: true, model: 'quantum', hideIdentity: true },
  };
}

function photonColor(r: Rand): Question {
  const pairs: [number, number][] = [[2, 3], [2, 4], [2, 5], [2, 6], [1, 2], [1, 3], [3, 4], [3, 5]];
  const [lo, up] = pick(r, pairs);
  const nm = tableWavelengthNm(lo, up);
  const region = wavelengthToRgb(nm).region;
  const label = (n: number) =>
    n < 380 ? 'Ultravioleta (invisible)' : n > 750 ? 'Infrarroja (invisible)' : n > 600 ? 'Roja' : n > 470 ? 'Cian' : n > 425 ? 'Azul' : 'Violeta';
  const correct = label(nm);
  return {
    kind: 'luz',
    prompt: `En el hidrógeno, el electrón baja del nivel n = ${up} al n = ${lo}. ¿Qué luz emite?`,
    answer: choice(r, correct, ['Roja', 'Cian', 'Azul', 'Violeta', 'Ultravioleta (invisible)', 'Infrarroja (invisible)']),
    explain: `Emite un fotón de ${nm.toFixed(1).replace('.', ',')} nm (${lineName(lo, up)})${
      region === 'visible' ? '' : `, fuera de lo que ve el ojo`
    }. Cuanto mayor es el salto de energía, menor es la longitud de onda.`,
    view: { z: 1, charge: 0, neutrons: null, excited: { n: up, l: 1, m: 0 }, hideIdentity: true },
  };
}

function electronegativity(r: Rand): Question {
  const known = ELEMENTS.filter((e) => e.electronegativity !== null && e.z <= 56);
  let a = pick(r, known);
  let b = pick(r, known);
  while (b.z === a.z || Math.abs(a.electronegativity! - b.electronegativity!) < 0.4) {
    a = pick(r, known);
    b = pick(r, known);
  }
  const winner = a.electronegativity! > b.electronegativity! ? a : b;
  const options = [a.name, b.name];
  return {
    kind: 'electronegatividad',
    prompt: `¿Cuál atrae más los electrones de un enlace (es más <strong>electronegativo</strong>)?`,
    answer: { type: 'choice', options, correct: options.indexOf(winner.name) },
    explain: `${a.name}: ${String(a.electronegativity).replace('.', ',')} · ${b.name}: ${String(b.electronegativity).replace('.', ',')} (escala de Pauling). Crece hacia arriba y hacia la derecha de la tabla.`,
    view: { z: winner.z, charge: 0, neutrons: null, excited: null, hideIdentity: true },
  };
}

const GENERATORS: Record<Level, ((r: Rand, level: Level) => Question)[]> = {
  sencillo: [protonsToElement, findElement, neutronCount, (r) => ionElectrons(r), categoryOf, isStable],
  completo: [
    protonsToElement,
    findElement,
    neutronCount,
    (r) => ionElectrons(r),
    categoryOf,
    isStable,
    (r) => configurationOf(r),
    (r) => orbitalShape(r),
    (r) => photonColor(r),
    (r) => electronegativity(r),
  ],
};

/** Ronda de preguntas sin repetir tipo seguido */
export function makeRound(level: Level, count: number, r: Rand = Math.random): Question[] {
  const gens = GENERATORS[level];
  const out: Question[] = [];
  let lastKind = '';
  while (out.length < count) {
    const q = pick(r, gens)(r, level);
    if (q.kind === lastKind) continue;
    lastKind = q.kind;
    out.push(q);
  }
  return out;
}
