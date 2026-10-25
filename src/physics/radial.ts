import { laguerre, logFactorial } from './special';

/**
 * Parte radial hidrogenoide normalizada, en unidades atómicas:
 *   R_nl(r) = N · ρ^l · e^(−ρ/2) · L_{n−l−1}^{2l+1}(ρ),   ρ = 2Zr/n
 *   N = √[(2Z/n)³ · (n−l−1)! / (2n·(n+l)!)]
 * cumple ∫₀^∞ R² r² dr = 1 y tiene n−l−1 nodos radiales.
 *
 * Para átomos de varios electrones se usa con Z = Z_eff de Slater: es una
 * aproximación (no la solución exacta de Schrödinger), ver README.
 */
export function radial(n: number, l: number, r: number, z = 1): number {
  if (l >= n || l < 0) throw new Error(`Orbital imposible: n=${n}, l=${l}`);
  const rho = (2 * z * r) / n;
  const logN = 0.5 * (3 * Math.log((2 * z) / n) + logFactorial(n - l - 1) - Math.log(2 * n) - logFactorial(n + l));
  return Math.exp(logN - rho / 2) * Math.pow(rho, l) * laguerre(n - l - 1, 2 * l + 1, rho);
}

/** Densidad radial de probabilidad P(r) = r² R_nl(r)² */
export const radialDensity = (n: number, l: number, r: number, z = 1): number => {
  const R = radial(n, l, r, z);
  return r * r * R * R;
};

/** ⟨r⟩ exacto del hidrogenoide: (a₀/2Z)·[3n² − l(l+1)] */
export const meanRadius = (n: number, l: number, z = 1): number => (3 * n * n - l * (l + 1)) / (2 * z);

/** Radio hasta el que se tabula la densidad: más allá la probabilidad es < 1e-9 */
export const radialCutoff = (n: number, z = 1): number => (4 * n * n + 20) / z;

/** Posiciones de los nodos radiales (raíces de R_nl), por bisección */
export function radialNodes(n: number, l: number, z = 1): number[] {
  const nodes: number[] = [];
  const rMax = radialCutoff(n, z);
  const steps = 20000;
  let prevR = 1e-9;
  let prevV = radial(n, l, prevR, z);
  for (let i = 1; i <= steps; i++) {
    const r = (rMax * i) / steps;
    const v = radial(n, l, r, z);
    if (Math.sign(v) !== Math.sign(prevV) && prevV !== 0) {
      let a = prevR;
      let b = r;
      for (let k = 0; k < 60; k++) {
        const mid = (a + b) / 2;
        if (Math.sign(radial(n, l, mid, z)) === Math.sign(radial(n, l, a, z))) a = mid;
        else b = mid;
      }
      nodes.push((a + b) / 2);
    }
    prevR = r;
    prevV = v;
  }
  return nodes;
}
