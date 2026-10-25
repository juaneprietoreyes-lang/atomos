import type { AtomModel } from '../atom-model';
import type { Excitation } from '../excitation';
import { levelEnergyEv, lineName, nuclearMassFromAtomic } from '../physics/hydrogen';
import { orbitalName } from '../physics/harmonics';
import { wavelengthToRgb, rgbCss } from '../physics/wavelength-color';
import { store, type AppState } from '../state';
import { chargeLabel, escapeHtml, num } from './format';
import { ionConfiguration } from '../physics/configuration';
import { neutronRange } from '../data/nuclides';
import { decayLabel, formatHalfLife } from '../physics/stability';
import { superscript } from './format';

export interface NucleusEditor {
  /** Cambiar el número de protones (cambia el elemento) */
  setProtons(z: number): void;
  setNeutrons(n: number): void;
}

/** Hasta dónde se deja añadir neutrones (el núcleo conocido más rico en neutrones tiene 178) */
const MAX_NEUTRONS = 200;

function nucleusSection(atom: AtomModel, s: AppState): string {
  const st = atom.stability;
  const name = `${superscript(String(atom.massNumber))}${escapeHtml(atom.element.symbol)}`;
  const range = neutronRange(s.z);
  let status = '';
  if (st.kind === 'stable') status = '<div class="nuc-status ok">✓ Núcleo estable: no se desintegra.</div>';
  else if (st.kind === 'radioactive')
    status = `<div class="nuc-status warn">☢ Radiactivo${
      st.halfLifeSeconds !== null ? ` · semivida <strong>${formatHalfLife(st.halfLifeSeconds)}</strong>` : ' · semivida desconocida'
    }<div class="muted">${escapeHtml(decayLabel(st.decay))}</div></div>`;
  else
    status = `<div class="nuc-status bad">✕ Nunca se ha observado este núcleo: si llega a formarse, se deshace casi al instante.${
      range ? `<div class="muted">Del ${escapeHtml(atom.element.name.toLowerCase())} se conocen núcleos con ${range[0]} a ${range[1]} neutrones (OIEA).</div>` : ''
    }</div>`;
  return `
    <div class="act-section">
      <div class="act-title">Núcleo <span class="muted">· ${name}</span></div>
      <div class="nuc-row"><span class="nuc-dot p"></span><span>Protones</span>
        <button type="button" class="btn" data-p="-1" ${s.z <= 1 ? 'disabled' : ''} aria-label="Quitar un protón">−</button>
        <strong class="nuc-n">${atom.protons}</strong>
        <button type="button" class="btn" data-p="1" ${s.z >= 118 ? 'disabled' : ''} aria-label="Añadir un protón">+</button></div>
      <div class="nuc-row"><span class="nuc-dot n"></span><span>Neutrones</span>
        <button type="button" class="btn" data-n="-1" ${atom.neutrons <= 0 ? 'disabled' : ''} aria-label="Quitar un neutrón">−</button>
        <strong class="nuc-n">${atom.neutrons}</strong>
        <button type="button" class="btn" data-n="1" ${atom.neutrons >= MAX_NEUTRONS ? 'disabled' : ''} aria-label="Añadir un neutrón">+</button></div>
      ${status}
      <p class="act-note">Cambiar los protones cambia de elemento; cambiar los neutrones, de isótopo.</p>
    </div>`;
}

/** Mínima carga negativa permitida: hasta tres electrones de más */
const MIN_CHARGE = -3;

function canAddElectron(atom: AtomModel, s: AppState): boolean {
  if (s.charge <= MIN_CHARGE) return false;
  try {
    ionConfiguration(atom.element.configuration.shells, s.charge - 1);
    return true;
  } catch {
    return false; // no quedan subcapas sin orbitales g
  }
}

const stateLabel = (n: number, l: number, m: number) =>
  l === 0 ? `${n}s` : `${n}${orbitalName(l, m).replace('_', '')}`;

function formatTime(seconds: number): string {
  if (seconds < 1e-6) return `${num(seconds * 1e9, seconds < 1e-8 ? 2 : 1)} ns`;
  if (seconds < 1e-3) return `${num(seconds * 1e6, 1)} µs`;
  return `${num(seconds, 2)} s`;
}

export function renderActions(
  container: HTMLElement,
  atom: AtomModel,
  s: AppState,
  exc: Excitation,
  editor: NucleusEditor,
  /** Modo sencillo: sin la excitación del electrón */
  simple = false,
): void {
  const el = atom.element;
  const canRemove = atom.electrons > 0;
  const canAdd = canAddElectron(atom, s);
  const ionNote =
    s.charge <= -2
      ? '<p class="act-note">Un anión con carga −2 o −3 no es estable aislado (en gas pierde el electrón); existe en sólidos y disoluciones.</p>'
      : atom.electrons === 0
        ? '<p class="act-note">Núcleo desnudo: sin electrones no hay nube.</p>'
        : '';

  let excitation = '';
  if (atom.electrons === 1 && !simple) {
    const c = exc.current();
    const mass = nuclearMassFromAtomic(atom.atomicMassU, s.z);
    const energy = levelEnergyEv(c.n, s.z, mass);
    const channels = exc.channels();
    const busy = exc.isBusy();
    const targets = exc
      .targets(7)
      .map((n) => {
        const { tableNm } = exc.absorbWavelength(n);
        const { region } = wavelengthToRgb(tableNm);
        const color = rgbCss(wavelengthToRgb(tableNm));
        return `<button type="button" class="lvl" data-absorb="${n}" ${busy ? 'disabled' : ''} title="${s.z === 1 ? escapeHtml(lineName(c.n, n)) : ''}">
          <span class="lvl-n">n = ${n}</span>
          <span class="lvl-l" style="--lc:${color}">${num(tableNm, 1)} nm${region !== 'visible' ? ` <em>${region}</em>` : ''}</span>
        </button>`;
      })
      .join('');
    const lt = exc.currentLifetime();
    const stateInfo =
      c.n === 1
        ? 'Estado fundamental: no puede bajar más.'
        : c.n === 2 && c.l === 0
          ? 'El 2s es <strong>metaestable</strong>: para ir a 1s tendría que emitir un fotón con Δl = 0, que está prohibido. Lo hace emitiendo dos fotones a la vez (vida media ≈ 0,12 s, unos 76 millones de veces más que la del 2p).'
          : `Vida media real: <strong>${formatTime(lt)}</strong> (la animación va a cámara lenta).`;
    const last = s.lastPhoton;
    const lastHtml = last
      ? `<div class="last-photon">
          <i style="--lc:${last.kind === 'two-photon' ? '#b9a6ff' : rgbCss(wavelengthToRgb(last.tableNm))}"></i>
          <div>${
            last.kind === 'two-photon'
              ? 'Dos fotones (2s → 1s): reparten 10,2 eV en un espectro continuo'
              : `${last.kind === 'emit' ? 'Emitido' : 'Absorbido'}: <strong>${num(last.tableNm, 2)} nm</strong> ${
                  last.tableNm >= 200 && last.tableNm <= 2000 ? '(aire)' : '(vacío)'
                } · ${s.z === 1 ? escapeHtml(lineName(last.nLower, last.nUpper)) : `n ${last.nUpper} → ${last.nLower}`}
                 <div class="muted">ΔE = ${num(1239.84198 / last.vacuumNm, 3)} eV · ${wavelengthToRgb(last.tableNm).region === 'visible' ? 'luz visible' : wavelengthToRgb(last.tableNm).region === 'UV' ? 'ultravioleta (invisible)' : 'infrarrojo (invisible)'}</div>`
          }</div>
        </div>`
      : '';
    excitation = `
      <div class="act-section">
        <div class="act-title">Excitar el electrón</div>
        <div class="act-state">Estado: <strong>${stateLabel(c.n, c.l, c.m)}</strong> · E = ${num(energy, 3)} eV</div>
        <div class="act-sub">Absorber un fotón para subir a…</div>
        <div class="lvl-list">${targets}</div>
        <div class="act-row">
          <button type="button" class="btn" data-emit ${busy || !channels.length ? 'disabled' : ''}>Emitir fotón</button>
          ${c.n === 2 && c.l === 0 ? `<button type="button" class="btn" data-two ${busy ? 'disabled' : ''}>Dos fotones</button>` : ''}
          <label class="chk"><input type="checkbox" data-auto ${exc.auto ? 'checked' : ''}/> Cascada automática</label>
        </div>
        <p class="act-note">${stateInfo}</p>
        ${lastHtml}
      </div>`;
  }

  container.innerHTML = `
    <div class="panel actions">
      ${nucleusSection(atom, s)}
      <div class="act-section">
        <div class="act-title">Ion <span class="muted">· electrones</span></div>
        <div class="ion-row">
          <button type="button" class="btn" data-remove ${canRemove ? '' : 'disabled'} title="Quitar un electrón">− e⁻</button>
          <span class="ion-label">${escapeHtml(chargeLabel(el.symbol, s.charge))}</span>
          <button type="button" class="btn" data-add ${canAdd ? '' : 'disabled'} title="Añadir un electrón">+ e⁻</button>
          ${s.charge !== 0 ? '<button type="button" class="btn btn-ghost" data-neutral>Neutro</button>' : ''}
        </div>
        ${ionNote}
      </div>
      ${excitation}
    </div>`;

  const on = (sel: string, fn: () => void) => container.querySelector(sel)?.addEventListener('click', fn);
  const setCharge = (charge: number) => {
    exc.reset();
    store.set({ charge, excited: null, lastPhoton: null, hidden: new Set() });
  };
  on('[data-remove]', () => setCharge(s.charge + 1));
  on('[data-add]', () => setCharge(s.charge - 1));
  on('[data-neutral]', () => setCharge(0));
  on('[data-emit]', () => exc.emit());
  container.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((b) =>
    b.addEventListener('click', () => editor.setProtons(s.z + Number(b.dataset.p))),
  );
  container.querySelectorAll<HTMLButtonElement>('[data-n]').forEach((b) =>
    b.addEventListener('click', () => editor.setNeutrons(atom.neutrons + Number(b.dataset.n))),
  );
  on('[data-two]', () => exc.twoPhoton());
  container.querySelector<HTMLInputElement>('[data-auto]')?.addEventListener('change', (e) =>
    exc.setAuto((e.target as HTMLInputElement).checked),
  );
  container.querySelectorAll<HTMLButtonElement>('[data-absorb]').forEach((b) =>
    b.addEventListener('click', () => exc.absorb(Number(b.dataset.absorb))),
  );
}
