import { CATEGORY_SINGULAR } from '../data/loader';
import type { ElementData } from '../data/types';
import { formatConfiguration, ionConfiguration, madelungConfiguration } from '../physics/configuration';
import { chargeLabel, escapeHtml, num, prettyConfiguration, superscript } from './format';

/** 1 eV = 96,485 332 12 kJ/mol (CODATA 2018) */
const EV_TO_KJMOL = 96.48533212;

export interface CardOptions {
  charge: number;
  isotopeIndex: number;
  onIsotope: (index: number) => void;
}

const unknown = (label = 'desconocido') => `<span class="unknown">${label}</span>`;
const tag = (text: string, kind = '') => `<span class="tag ${kind}">${escapeHtml(text)}</span>`;

function row(label: string, value: string, extra = ''): string {
  return `<div class="prop"><dt>${label}</dt><dd>${value}${extra ? `<div class="prop-extra">${extra}</div>` : ''}</dd></div>`;
}

export function renderCard(container: HTMLElement, el: ElementData, opts: CardOptions): void {
  const { charge, isotopeIndex } = opts;
  const cfg = el.configuration;
  const iso = el.isotopes[isotopeIndex];

  // --- Configuración (del átomo neutro o del ion)
  const ionShells = charge === 0 ? cfg.shells : ionConfiguration(cfg.shells, charge);
  const cfgText = charge === 0 ? cfg.text : formatConfiguration(ionShells) || 'sin electrones';
  const cfgTags = [
    tag(cfg.source === 'NIST' ? 'NIST' : 'PubChem'),
    cfg.predicted ? tag('predicha (cálculo teórico)', 'warn') : '',
    cfg.madelungException ? tag('excepción a la regla de Madelung', 'accent') : '',
    charge !== 0 ? tag('ion: regla aproximada', 'warn') : '',
  ].join('');
  const cfgExtra = cfg.madelungException
    ? `Por Madelung saldría ${prettyConfiguration(formatConfiguration(madelungConfiguration(el.z)))}; la real (medida) es otra.`
    : '';

  // --- Masa
  const mass =
    el.bracketMassNumber !== null
      ? `[${el.bracketMassNumber}] <span class="muted">sin isótopos naturales: número másico del más estable</span>`
      : el.atomicMass !== null
        ? `${num(el.atomicMass, 4)} u`
        : unknown();

  // --- Energía de ionización
  const ie = el.ionizationEnergy;
  const ieText = ie
    ? `${num(ie.eV, 3)} eV <span class="muted">· ${num(ie.eV * EV_TO_KJMOL, 1)} kJ/mol</span>` +
      (ie.quality === 'teórica'
        ? ` <span title="NIST la da calculada (ab initio): en átomos de 1–2 electrones el cálculo es más preciso que la medida; en los superpesados es lo único que hay">${tag('calculada', 'warn')}</span>`
        : ie.quality === 'semiempírica'
          ? ` <span title="NIST la obtiene interpolando o extrapolando datos experimentales">${tag('semiempírica', 'warn')}</span>`
          : '')
    : unknown('desconocida');

  // --- Radio
  const r = el.radius;
  const otherRadii = [
    r.empirical !== null ? `empírico ${r.empirical} pm` : '',
    r.covalent !== null ? `covalente ${r.covalent} pm` : '',
    r.vanDerWaals !== null ? `van der Waals ${r.vanDerWaals} pm` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const radiusText = r.calculated !== null ? `${r.calculated} pm <span class="muted">(calculado)</span>` : unknown();

  // --- Estado
  const phase = el.phase
    ? `${el.phase.value.charAt(0).toUpperCase()}${el.phase.value.slice(1)}` +
      (el.phase.predicted ? ` ${tag('predicho', 'warn')}` : '')
    : unknown();
  const phaseExtra = el.phase?.alternative ? `Otra predicción: ${el.phase.alternative}.` : '';

  // --- Electronegatividad
  const en = el.electronegativity !== null ? num(el.electronegativity, 2) : unknown('desconocida');
  const enExtra = el.electronegativityAlt !== null ? `Otra tabla (PubChem) da ${num(el.electronegativityAlt, 2)}.` : '';

  // --- Isótopos
  const isoRows = el.isotopes
    .map((i, idx) => {
      const status = i.stable
        ? 'estable'
        : i.halfLifeText
          ? `t½ ${escapeHtml(i.halfLifeText)}`
          : 'radiactivo';
      const ab = i.abundance !== null ? `${num(i.abundance, 3)} %` : '—';
      return `<button type="button" class="iso${idx === isotopeIndex ? ' is-active' : ''}" data-iso="${idx}" aria-pressed="${idx === isotopeIndex}">
        <span class="iso-name">${superscript(String(i.a))}${escapeHtml(el.symbol)}</span>
        <span class="iso-n">${i.neutrons} n</span>
        <span class="iso-ab">${ab}</span>
        <span class="iso-hl">${status}</span>
      </button>`;
    })
    .join('');

  const title = charge === 0 ? el.symbol : chargeLabel(el.symbol, charge);
  container.innerHTML = `
    <header class="card-head cat-${el.category}">
      <div class="card-symbol">${escapeHtml(title)}</div>
      <div class="card-title">
        <div class="card-name">${escapeHtml(el.name)}${charge !== 0 ? ` <span class="muted">(ion ${charge > 0 ? '+' : '−'}${Math.abs(charge)})</span>` : ''}</div>
        <div class="card-sub">Z = ${el.z} · ${escapeHtml(el.nameEn)} · ${CATEGORY_SINGULAR[el.category]}${
          el.categoryPredicted ? ' ' + tag('predicha', 'warn') : ''
        }</div>
      </div>
    </header>
    <dl class="props">
      ${row('Configuración', `<span class="cfg">${prettyConfiguration(cfgText)}</span> ${cfgTags}`, cfgExtra)}
      ${row('Masa atómica', mass)}
      ${row('Grupo · periodo · bloque', `${el.group ?? '—'} · ${el.period} · ${el.block}`, el.group === null ? 'Las series de lantánidos y actínidos no tienen número de grupo propio.' : '')}
      ${row('Electronegatividad (Pauling)', en, enExtra)}
      ${row('1ª energía de ionización', ieText)}
      ${row('Radio atómico', radiusText, otherRadii)}
      ${row('Estado a 25 °C', phase, phaseExtra)}
    </dl>
    <div class="isotopes">
      <div class="section-title">Isótopos ${iso ? `<span class="muted">· núcleo dibujado: ${superscript(String(iso.a))}${escapeHtml(el.symbol)}</span>` : ''}</div>
      ${
        el.isotopes.length
          ? `<div class="iso-head"><span>isótopo</span><span>neutrones</span><span>abundancia</span><span>estabilidad</span></div>${isoRows}`
          : unknown('sin datos de isótopos')
      }
    </div>
    <p class="sources">Fuentes: NIST ASD, PubChem, IAEA/ENSDF, Wikidata y Periodic-Table-JSON (CC BY-SA).</p>`;

  container.querySelectorAll<HTMLButtonElement>('.iso').forEach((b) =>
    b.addEventListener('click', () => opts.onIsotope(Number(b.dataset.iso))),
  );
}
