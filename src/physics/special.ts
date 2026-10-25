/** Funciones especiales: log-gamma, factoriales, Laguerre asociados y Legendre asociados. */

/** ln Γ(x) por la aproximación de Lanczos (g = 7), precisión ~1e-15 */
export function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export const logFactorial = (n: number): number => logGamma(n + 1);

/**
 * Polinomio de Laguerre asociado (generalizado) L_k^α(x) por la recurrencia
 * (k+1) L_{k+1} = (2k+1+α−x) L_k − (k+α) L_{k−1}.
 */
export function laguerre(k: number, alpha: number, x: number): number {
  if (k === 0) return 1;
  let prev = 1;
  let cur = 1 + alpha - x;
  for (let i = 1; i < k; i++) {
    const next = ((2 * i + 1 + alpha - x) * cur - (i + alpha) * prev) / (i + 1);
    prev = cur;
    cur = next;
  }
  return cur;
}

/**
 * Legendre asociado P_l^m(x), m ≥ 0, SIN la fase de Condon–Shortley, para que los
 * armónicos reales tengan su lóbulo positivo en +x, +y, +z (convención de química).
 */
export function assocLegendre(l: number, m: number, x: number): number {
  let pmm = 1;
  if (m > 0) {
    const s = Math.sqrt(Math.max(0, 1 - x * x));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= fact * s;
      fact += 2;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}
