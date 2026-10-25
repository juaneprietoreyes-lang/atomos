/** Formato de números en español (coma decimal) y utilidades de texto. */
const cache = new Map<string, Intl.NumberFormat>();

export function num(value: number, maxDecimals = 3, minDecimals = 0): string {
  const key = `${maxDecimals}-${minDecimals}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('es-ES', {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: minDecimals,
      useGrouping: 'min2',
    });
    cache.set(key, f);
  }
  return f.format(value);
}

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻',
};
export const superscript = (s: string): string => s.replace(/[0-9+-]/g, (c) => SUP[c] ?? c);

/** «[Ar] 3d5 4s1» → «[Ar] 3d⁵ 4s¹» */
export const prettyConfiguration = (text: string): string =>
  text.replace(/(\d[spdfg])(\d+)/g, (_, sub: string, e: string) => sub + superscript(e));

/** Carga en notación química: Na⁺, Fe²⁺, Cl⁻, O²⁻ */
export function chargeLabel(symbol: string, charge: number): string {
  if (charge === 0) return symbol;
  const mag = Math.abs(charge) === 1 ? '' : String(Math.abs(charge));
  return symbol + superscript(mag + (charge > 0 ? '+' : '-'));
}

/** Para buscar sin tildes ni mayúsculas */
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
