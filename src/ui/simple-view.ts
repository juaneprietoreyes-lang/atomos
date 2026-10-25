import type { AtomModel } from '../atom-model';
import { CATEGORY_SINGULAR } from '../data/loader';
import { formatHalfLife } from '../physics/stability';
import { chargeLabel, escapeHtml, num, superscript } from './format';

/** Modo sencillo: lo básico, con palabras de clase y sin jerga de mecánica cuántica. */

const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];

/** Electrones por capa (n = 1, 2, 3…) */
export function electronsPerShell(atom: AtomModel): number[] {
  const out: number[] = [];
  for (const s of atom.shells) out[s.n - 1] = (out[s.n - 1] ?? 0) + s.electrons;
  return Array.from(out, (x) => x ?? 0);
}

/** Panel del visor: las tres partículas y las capas */
export function renderParticles(container: HTMLElement, atom: AtomModel): void {
  const shells = electronsPerShell(atom);
  container.innerHTML = `
    <div class="lg-title">Partículas</div>
    <div class="particles">
      <div><i class="pdot p"></i>Protones <strong>${atom.protons}</strong></div>
      <div><i class="pdot n"></i>Neutrones <strong>${atom.neutrons}</strong></div>
      <div><i class="pdot e"></i>Electrones <strong>${atom.electrons}</strong></div>
    </div>
    ${
      shells.length
        ? `<div class="lg-title" style="margin-top:8px">Electrones por capa</div>
           <div class="shells">${shells.map((c, i) => `<span><b>${SHELL_NAMES[i]}</b> ${c}</span>`).join('')}</div>`
        : ''
    }
    <p class="lg-note">La nube no es una órbita: marca dónde es más probable encontrar los electrones. Cuanto más brilla, más probable.</p>`;
}

/** Ficha sencilla del elemento */
export function renderSimpleCard(
  container: HTMLElement,
  atom: AtomModel,
  charge: number,
  onIsotope: (index: number) => void,
): void {
  const el = atom.element;
  const shells = electronsPerShell(atom);
  const st = atom.stability;
  const nucleus =
    st.kind === 'stable'
      ? 'Su núcleo es estable.'
      : st.kind === 'radioactive'
        ? `Su núcleo es radiactivo${st.halfLifeSeconds !== null ? ` (semivida ${formatHalfLife(st.halfLifeSeconds)})` : ''}.`
        : 'Ese núcleo nunca se ha observado.';
  const row = (label: string, value: string) => `<div class="prop"><dt>${label}</dt><dd>${value}</dd></div>`;
  const isotopes = el.isotopes
    .slice(0, 6)
    .map(
      (i, idx) =>
        `<button type="button" class="chip${i.a === atom.massNumber ? ' is-active' : ''}" data-iso="${idx}">${superscript(String(i.a))}${escapeHtml(el.symbol)}${
          i.abundance !== null ? ` · ${num(i.abundance, 1)} %` : ''
        }</button>`,
    )
    .join('');
  container.innerHTML = `
    <header class="card-head cat-${el.category}">
      <div class="card-symbol">${escapeHtml(chargeLabel(el.symbol, charge))}</div>
      <div class="card-title">
        <div class="card-name">${escapeHtml(el.name)}</div>
        <div class="card-sub">${CATEGORY_SINGULAR[el.category]}${el.categoryPredicted ? ' (predicho)' : ''}</div>
      </div>
    </header>
    <p class="simple-lead">El ${escapeHtml(el.name.toLowerCase())} tiene <strong>${atom.protons} protones</strong>, ${atom.neutrons} neutrones y ${atom.electrons} electrones. ${nucleus}</p>
    <dl class="props">
      ${row('Número atómico (Z)', `${el.z} <span class="muted">= número de protones</span>`)}
      ${row('Número másico (A)', `${atom.massNumber} <span class="muted">= protones + neutrones</span>`)}
      ${row('Masa atómica', el.bracketMassNumber !== null ? `[${el.bracketMassNumber}] u` : el.atomicMass !== null ? `${num(el.atomicMass, 3)} u` : '<span class="unknown">desconocida</span>')}
      ${row('Electrones por capa', shells.length ? shells.join(' · ') : '—')}
      ${row('Grupo y periodo', `${el.group !== null ? `grupo ${el.group}` : el.category === 'lantanido' ? 'lantánidos' : 'actínidos'} · periodo ${el.period}`)}
      ${row('Estado a 25 °C', el.phase ? `${el.phase.value}${el.phase.predicted ? ' (predicho)' : ''}` : '<span class="unknown">desconocido</span>')}
    </dl>
    ${isotopes ? `<div class="section-title">Isótopos <span class="muted">· toca para cambiar el núcleo</span></div><div class="chips">${isotopes}</div>` : ''}`;
  container.querySelectorAll<HTMLButtonElement>('[data-iso]').forEach((b) =>
    b.addEventListener('click', () => onIsotope(Number(b.dataset.iso))),
  );
}
