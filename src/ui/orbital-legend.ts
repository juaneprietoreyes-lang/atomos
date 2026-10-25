import type { OrbitalSpec } from '../physics/orbitals';
import { subshellCss } from '../render/colors';
import { escapeHtml, num, superscript } from './format';

/**
 * Leyenda de orbitales: una fila por subcapa (color, electrones, Z_eff) que se
 * despliega en sus orbitales reales. Cada casilla muestra u oculta su nube.
 */
export function renderOrbitalLegend(
  container: HTMLElement,
  orbitals: OrbitalSpec[],
  hidden: ReadonlySet<string>,
  phase: boolean,
  hund: boolean,
  expanded: Set<string>,
  onChange: (hidden: Set<string>) => void,
): void {
  const groups = new Map<string, OrbitalSpec[]>();
  for (const o of orbitals) groups.set(o.subshell, [...(groups.get(o.subshell) ?? []), o]);

  const rows = [...groups.entries()]
    .map(([sub, orbs]) => {
      const { n, l } = orbs[0];
      const electrons = orbs.reduce((s, o) => s + o.occupancy, 0);
      const allHidden = orbs.every((o) => hidden.has(o.label));
      const someHidden = !allHidden && orbs.some((o) => hidden.has(o.label));
      const open = expanded.has(sub);
      const children =
        l > 0 && open
          ? `<div class="lg-children">${orbs
              .map(
                (o) => `<label class="lg-orb">
              <input type="checkbox" data-orb="${escapeHtml(o.label)}" ${hidden.has(o.label) ? '' : 'checked'} />
              <span>${escapeHtml(o.label.slice(String(o.n).length))}</span>
              <span class="lg-e">${num(o.occupancy, 2)} e⁻</span>
            </label>`,
              )
              .join('')}</div>`
          : '';
      return `<div class="lg-row">
        <label class="lg-sub">
          <input type="checkbox" data-sub="${sub}" ${allHidden ? '' : 'checked'} ${someHidden ? 'data-mixed="1"' : ''} />
          <i class="lg-swatch" style="--sw:${phase ? 'linear-gradient(90deg,#ff9a62 50%,#5fb2ff 50%)' : subshellCss(n, l)}"></i>
          <span class="lg-name">${n}${'spdf'[l]}${superscript(String(Math.round(electrons)))}</span>
          <span class="lg-z" title="Carga nuclear efectiva (Slater)">Z<sub>ef</sub> ${num(orbs[0].zEff, 2)}</span>
        </label>
        ${l > 0 ? `<button type="button" class="lg-more" data-expand="${sub}" aria-expanded="${open}" aria-label="Ver orbitales ${sub}">${open ? '−' : '+'}</button>` : ''}
        ${children}
      </div>`;
    })
    .join('');

  const partial = [...groups.values()].some(
    (orbs) => orbs[0].l > 0 && orbs.reduce((s, o) => s + o.occupancy, 0) < 2 * (2 * orbs[0].l + 1) - 1e-9,
  );
  const note = !partial
    ? ''
    : hund
      ? 'En una subcapa a medio llenar, qué orbitales concretos se dibujan (p<sub>z</sub>, p<sub>x</sub>…) es una convención: todos tienen la misma energía.'
      : 'Promedio esférico: los electrones de cada subcapa se reparten por igual entre sus orbitales y la nube total sale esférica.';
  container.innerHTML = `
    <div class="lg-title">Orbitales <span class="muted">· clic para ocultar</span></div>
    <div class="lg-list">${rows}</div>
    ${note ? `<p class="lg-note">${note}</p>` : ''}`;

  container.querySelectorAll<HTMLInputElement>('input[data-mixed]').forEach((i) => (i.indeterminate = true));

  container.querySelectorAll<HTMLInputElement>('input[data-sub]').forEach((input) =>
    input.addEventListener('change', () => {
      const next = new Set(hidden);
      for (const o of groups.get(input.dataset.sub!) ?? []) {
        if (input.checked) next.delete(o.label);
        else next.add(o.label);
      }
      onChange(next);
    }),
  );
  container.querySelectorAll<HTMLInputElement>('input[data-orb]').forEach((input) =>
    input.addEventListener('change', () => {
      const next = new Set(hidden);
      if (input.checked) next.delete(input.dataset.orb!);
      else next.add(input.dataset.orb!);
      onChange(next);
    }),
  );
  container.querySelectorAll<HTMLButtonElement>('[data-expand]').forEach((b) =>
    b.addEventListener('click', () => {
      const sub = b.dataset.expand!;
      if (expanded.has(sub)) expanded.delete(sub);
      else expanded.add(sub);
      onChange(new Set(hidden));
    }),
  );
}
