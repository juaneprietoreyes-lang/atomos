import type { Subshell } from './configuration';

/**
 * Carga nuclear efectiva con las reglas de Slater (1930).
 *
 * Grupos, en este orden: (1s)(2s,2p)(3s,3p)(3d)(4s,4p)(4d)(4f)(5s,5p)(5d)(5f)(6s,6p)(6d)(7s,7p)(8s)
 * Apantallamiento S que sufre un electrón del grupo G:
 *  - otro electrón del mismo grupo: 0,35 (0,30 si G = 1s)
 *  - si G es ns/np: cada electrón con número cuántico n−1 aporta 0,85 y cada uno con
 *    n−2 o menos, 1,00
 *  - si G es nd/nf: cada electrón de un grupo anterior aporta 1,00
 *  - los grupos posteriores no apantallan
 * Z_eff = Z − S.
 *
 * Aproximación: Slater ajustó estas reglas a mano; además aquí se combinan con
 * orbitales hidrogenoides de n entero (Slater usaba n* no entero y orbitales sin nodos).
 */
const groupKey = (n: number, l: number): number => n * 10 + (l <= 1 ? 0 : l);

export function slaterShielding(shells: Subshell[], n: number, l: number): number {
  const g = groupKey(n, l);
  let s = 0;
  for (const sh of shells) {
    const gk = groupKey(sh.n, sh.l);
    // El propio electrón no se apantalla a sí mismo
    const count = gk === g ? sh.electrons - (sh.n === n && sh.l === l ? 1 : 0) : sh.electrons;
    if (count <= 0) continue;
    if (gk === g) s += count * (n === 1 ? 0.3 : 0.35);
    else if (gk > g) continue;
    else if (l <= 1) {
      if (sh.n === n - 1) s += count * 0.85;
      else if (sh.n <= n - 2) s += count * 1.0;
      // misma n pero grupo d/f anterior: no puede ocurrir (d y f van detrás de s,p de su n)
    } else s += count * 1.0;
  }
  return s;
}

export function zEffective(z: number, shells: Subshell[], n: number, l: number): number {
  const own = shells.find((s) => s.n === n && s.l === l);
  // Si la subcapa está vacía (p. ej. al añadir el primer electrón), se cuenta como si lo tuviera
  const withSelf = own ? shells : [...shells, { n, l, electrons: 1 }];
  return z - slaterShielding(withSelf, n, l);
}
