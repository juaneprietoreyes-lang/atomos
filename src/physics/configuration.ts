/**
 * Configuraciones electrónicas: lectura, notación, orden de Madelung e iones.
 * Módulo puro (sin DOM): lo usan la app, los tests y el script de datos.
 *
 * Las configuraciones de los átomos neutros NO se calculan aquí: vienen de NIST
 * (con sus excepciones reales: Cr, Cu, Pd, Au…). Madelung solo se usa para
 * detectar esas excepciones y para añadir electrones al formar aniones.
 */

export const L_LETTERS = ['s', 'p', 'd', 'f', 'g'] as const;

export interface Subshell {
  n: number;
  l: number;
  electrons: number;
}

export const capacity = (l: number): number => 2 * (2 * l + 1);

export const subshellLabel = (n: number, l: number): string => `${n}${L_LETTERS[l]}`;

const NOBLE_CORES: Record<string, string> = {
  He: '1s2',
  Ne: '[He] 2s2 2p6',
  Ar: '[Ne] 3s2 3p6',
  Kr: '[Ar] 3d10 4s2 4p6',
  Xe: '[Kr] 4d10 5s2 5p6',
  Rn: '[Xe] 4f14 5d10 6s2 6p6',
  // NIST usa también estos dos núcleos en su lista de capas
  Cd: '[Kr] 4d10 5s2',
  Hg: '[Xe] 4f14 5d10 6s2',
};

/** Orden de las capas para mostrar el núcleo de gas noble: el mayor que quepa. */
const DISPLAY_CORES = ['Rn', 'Xe', 'Kr', 'Ar', 'Ne', 'He'] as const;

/**
 * Lee configuraciones en los formatos de NIST («[Ar].3d5.4s»), Bowserinator
 * («[Xe] 5d16s2», «*[Rn] 5f14 …») y PubChem («[Ar]4s1 3d10 (predicted)»).
 * Un número que supera la capacidad de la subcapa se trata como dos tokens
 * pegados: «5d16s2» = 5d¹ 6s².
 */
export function parseConfiguration(text: string): Subshell[] {
  const clean = text.replace(/\(predicted\)|\*/gi, ' ').trim();
  const out = new Map<string, Subshell>();
  const add = (n: number, l: number, e: number) => {
    const key = subshellLabel(n, l);
    const prev = out.get(key);
    if (prev) prev.electrons += e;
    else out.set(key, { n, l, electrons: e });
  };

  let i = 0;
  while (i < clean.length) {
    const c = clean[i];
    if (c === '[') {
      const end = clean.indexOf(']', i);
      const core = clean.slice(i + 1, end);
      const expansion = NOBLE_CORES[core];
      if (!expansion) throw new Error(`Núcleo desconocido [${core}] en «${text}»`);
      for (const s of parseConfiguration(expansion)) add(s.n, s.l, s.electrons);
      i = end + 1;
    } else if (/\d/.test(c) && /[spdfg]/.test(clean[i + 1] ?? '')) {
      const n = Number(c);
      const l = L_LETTERS.indexOf(clean[i + 1] as (typeof L_LETTERS)[number]);
      i += 2;
      let digits = '';
      while (i < clean.length && /\d/.test(clean[i])) digits += clean[i++];
      // «5d16s2»: si el número no cabe en la subcapa, el último dígito es la n siguiente
      while (digits.length > 1 && Number(digits) > capacity(l)) {
        digits = digits.slice(0, -1);
        i--;
      }
      add(n, l, digits === '' ? 1 : Number(digits));
    } else {
      i++;
    }
  }
  return sortStandard([...out.values()].filter((s) => s.electrons > 0));
}

/** Orden de notación estándar (el de NIST): por n y luego por l. */
export function sortStandard(shells: Subshell[]): Subshell[] {
  return [...shells].sort((a, b) => a.n - b.n || a.l - b.l);
}

export const totalElectrons = (shells: Subshell[]): number => shells.reduce((s, x) => s + x.electrons, 0);

/** Orden de llenado de Madelung (n + l, luego n), hasta 8s. Sin orbitales g. */
export const MADELUNG_ORDER: { n: number; l: number }[] = (() => {
  const list: { n: number; l: number }[] = [];
  for (let n = 1; n <= 8; n++) for (let l = 0; l < Math.min(n, 4); l++) list.push({ n, l });
  return list.filter((s) => s.n + s.l <= 8).sort((a, b) => a.n + a.l - (b.n + b.l) || a.n - b.n);
})();

/** Configuración que predice la regla de Madelung (Aufbau) para N electrones. */
export function madelungConfiguration(electrons: number): Subshell[] {
  const out: Subshell[] = [];
  let left = electrons;
  for (const { n, l } of MADELUNG_ORDER) {
    if (left <= 0) break;
    const e = Math.min(left, capacity(l));
    out.push({ n, l, electrons: e });
    left -= e;
  }
  return sortStandard(out);
}

export function sameConfiguration(a: Subshell[], b: Subshell[]): boolean {
  const key = (s: Subshell[]) =>
    sortStandard(s)
      .map((x) => `${x.n}${x.l}:${x.electrons}`)
      .join(',');
  return key(a) === key(b);
}

/** Notación compacta con núcleo de gas noble: «[Ar] 3d5 4s1». */
export function formatConfiguration(shells: Subshell[], useCore = true): string {
  const sorted = sortStandard(shells);
  let coreLabel = '';
  let rest = sorted;
  if (useCore) {
    for (const core of DISPLAY_CORES) {
      const coreShells = parseConfiguration(`[${core}]`);
      const contained = coreShells.every((c) =>
        sorted.some((s) => s.n === c.n && s.l === c.l && s.electrons === c.electrons),
      );
      // No uso el núcleo si deja todo vacío (p. ej. el propio Ar se escribe completo)
      if (contained && totalElectrons(sorted) > totalElectrons(coreShells)) {
        coreLabel = `[${core}]`;
        rest = sorted.filter((s) => !coreShells.some((c) => c.n === s.n && c.l === s.l));
        break;
      }
    }
  }
  const parts = rest.map((s) => `${subshellLabel(s.n, s.l)}${s.electrons}`);
  return [coreLabel, ...parts].filter(Boolean).join(' ');
}

/**
 * Configuración de un ion a partir de la del átomo neutro.
 * - Cationes: se quitan primero los electrones de mayor n y, a igual n, de mayor l
 *   (Fe²⁺ = [Ar] 3d6, no [Ar] 3d4 4s2). Es la regla habitual; hay excepciones raras.
 * - Aniones: se añaden siguiendo el orden de Madelung desde la configuración real.
 * Aproximación documentada en el README («Limitaciones del modelo»).
 */
export function ionConfiguration(neutral: Subshell[], charge: number): Subshell[] {
  const shells = sortStandard(neutral).map((s) => ({ ...s }));
  if (charge > 0) {
    let remove = charge;
    while (remove > 0) {
      const target = [...shells].filter((s) => s.electrons > 0).sort((a, b) => b.n - a.n || b.l - a.l)[0];
      if (!target) throw new Error('No quedan electrones que quitar');
      target.electrons--;
      remove--;
    }
  } else if (charge < 0) {
    let add = -charge;
    while (add > 0) {
      const next = MADELUNG_ORDER.find(({ n, l }) => {
        const s = shells.find((x) => x.n === n && x.l === l);
        return !s || s.electrons < capacity(l);
      });
      if (!next) throw new Error('No hay subcapas disponibles');
      const s = shells.find((x) => x.n === next.n && x.l === next.l);
      if (s) s.electrons++;
      else shells.push({ n: next.n, l: next.l, electrons: 1 });
      add--;
    }
  }
  return sortStandard(shells.filter((s) => s.electrons > 0));
}

/**
 * Ocupación de cada orbital real de una subcapa (índice = posición en REAL_M_ORDER).
 * - 'hund': primero un electrón en cada orbital y luego se aparean. Qué orbitales
 *   concretos se ocupan es una convención: en el átomo libre son degenerados.
 * - 'spherical': la ocupación se reparte por igual (teorema de Unsöld → nube esférica).
 */
export function orbitalOccupations(l: number, electrons: number, mode: 'hund' | 'spherical'): number[] {
  const k = 2 * l + 1;
  if (mode === 'spherical') return Array.from({ length: k }, () => electrons / k);
  return Array.from({ length: k }, (_, i) => (electrons > i ? 1 : 0) + (electrons > k + i ? 1 : 0));
}

/** Orden convencional de los orbitales reales: m = 0, +1, −1, +2, −2, +3, −3. */
export function realMOrder(l: number): number[] {
  const order = [0];
  for (let m = 1; m <= l; m++) order.push(m, -m);
  return order;
}
