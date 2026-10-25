import type { AtomModel } from '../atom-model';
import { CATEGORY_SINGULAR } from '../data/loader';
import { ionConfiguration } from '../physics/configuration';
import { formatHalfLife } from '../physics/stability';
import { shellCss } from '../render/colors';
import { chargeLabel, escapeHtml, num } from './format';

/** Modo sencillo: lo básico, con palabras de clase y sin jerga de mecánica cuántica. */

const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];

/** Electrones por capa (n = 1, 2, 3…) */
export function electronsPerShell(atom: AtomModel): number[] {
  const out: number[] = [];
  for (const s of atom.shells) out[s.n - 1] = (out[s.n - 1] ?? 0) + s.electrons;
  return Array.from(out, (x) => x ?? 0);
}

/** Panel del visor: las capas con el mismo color que su nube */
export function renderParticles(container: HTMLElement, atom: AtomModel): void {
  const shells = electronsPerShell(atom);
  container.innerHTML = shells.length
    ? `<div class="lg-title">Capas de electrones</div>
       <div class="shells">${shells
         .map((c, i) => `<span style="--sc:${shellCss(i + 1)}"><b>${SHELL_NAMES[i]}</b> ${c}</span>`)
         .join('')}</div>
       <p class="lg-note">Cada color es una capa. Donde la nube brilla más, es más fácil encontrar un electrón.</p>`
    : '<div class="lg-title">Sin electrones</div><p class="lg-note">Solo queda el núcleo.</p>';
}

export interface SimpleBuilder {
  setProtons(z: number): void;
  setNeutrons(n: number): void;
  setCharge(charge: number): void;
}

/** «Construye tu átomo»: protones, neutrones y electrones con − y + */
export function renderBuilder(container: HTMLElement, atom: AtomModel, charge: number, b: SimpleBuilder): void {
  const st = atom.stability;
  const status =
    st.kind === 'stable'
      ? '<div class="nuc-status ok">✓ Estable</div>'
      : st.kind === 'radioactive'
        ? `<div class="nuc-status warn">☢ Inestable${st.halfLifeSeconds !== null ? `: dura unos ${formatHalfLife(st.halfLifeSeconds)}` : ''}</div>`
        : '<div class="nuc-status bad">✕ Este núcleo no existe: se rompe al momento</div>';
  let canAdd = charge > -3;
  try {
    ionConfiguration(atom.element.configuration.shells, charge - 1);
  } catch {
    canAdd = false;
  }
  const ion =
    charge === 0 ? '' : `<p class="act-note">Es un <strong>ion ${charge > 0 ? 'positivo' : 'negativo'}</strong> (${escapeHtml(chargeLabel(atom.element.symbol, charge))}): tiene ${charge > 0 ? 'menos' : 'más'} electrones que protones.</p>`;
  const row = (dot: string, label: string, value: number, attr: string, canMinus: boolean, canPlus: boolean) => `
    <div class="nuc-row"><span class="nuc-dot ${dot}"></span><span>${label}</span>
      <button type="button" class="btn" data-${attr}="-1" ${canMinus ? '' : 'disabled'} aria-label="Quitar ${label.toLowerCase()}">−</button>
      <strong class="nuc-n">${value}</strong>
      <button type="button" class="btn" data-${attr}="1" ${canPlus ? '' : 'disabled'} aria-label="Añadir ${label.toLowerCase()}">+</button></div>`;
  container.innerHTML = `
    <div class="panel actions">
      <div class="act-title">Construye tu átomo</div>
      ${row('p', 'Protones', atom.protons, 'p', atom.protons > 1, atom.protons < 118)}
      ${row('n', 'Neutrones', atom.neutrons, 'n', atom.neutrons > 0, atom.neutrons < 200)}
      ${row('e', 'Electrones', atom.electrons, 'e', atom.electrons > 0, canAdd)}
      ${status}
      ${ion}
    </div>`;
  container.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((el) =>
    el.addEventListener('click', () => b.setProtons(atom.protons + Number(el.dataset.p))),
  );
  container.querySelectorAll<HTMLButtonElement>('[data-n]').forEach((el) =>
    el.addEventListener('click', () => b.setNeutrons(atom.neutrons + Number(el.dataset.n))),
  );
  // Más electrones = carga más negativa
  container.querySelectorAll<HTMLButtonElement>('[data-e]').forEach((el) =>
    el.addEventListener('click', () => b.setCharge(charge - Number(el.dataset.e))),
  );
}

/** Ficha sencilla: símbolo, nombre, las tres partículas y dos datos */
export function renderSimpleCard(container: HTMLElement, atom: AtomModel, charge: number): void {
  const el = atom.element;
  const where =
    el.group !== null ? `Grupo ${el.group}, periodo ${el.period}` : el.category === 'lantanido' ? 'Lantánidos' : 'Actínidos';
  const icon = { sólido: '🪨', líquido: '💧', gas: '💨' } as const;
  const phase = el.phase ? `${icon[el.phase.value]} ${el.phase.value.charAt(0).toUpperCase()}${el.phase.value.slice(1)}` : '❔ Desconocido';
  container.innerHTML = `
    <header class="card-head cat-${el.category}">
      <div class="card-symbol">${escapeHtml(chargeLabel(el.symbol, charge))}</div>
      <div class="card-title">
        <div class="card-name">${escapeHtml(el.name)}</div>
        <div class="card-sub">${CATEGORY_SINGULAR[el.category]}</div>
      </div>
    </header>
    <div class="big-three">
      <div><i class="pdot p"></i><strong>${atom.protons}</strong><span>protones</span></div>
      <div><i class="pdot n"></i><strong>${atom.neutrons}</strong><span>neutrones</span></div>
      <div><i class="pdot e"></i><strong>${atom.electrons}</strong><span>electrones</span></div>
    </div>
    <div class="simple-facts">
      <span>📍 ${where}</span>
      <span>${phase} a 25 °C</span>
      ${el.atomicMass !== null && el.bracketMassNumber === null ? `<span>⚖️ ${num(el.atomicMass, 2)} u</span>` : ''}
    </div>
    <p class="simple-lead">El número de <strong>protones</strong> dice qué elemento es: si cambias los protones, cambias de elemento.</p>`;
}
