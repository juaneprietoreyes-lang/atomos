import './styles.css';
import { computeAtom, type AtomModel } from './atom-model';
import { byZ, ELEMENTS } from './data/loader';
import { BOHR_RADIUS_FM, BOHR_RADIUS_PM } from './physics/constants';
import { nuclearRadiusFm } from './physics/nucleus';
import { Excitation } from './excitation';
import { AtomView, frameRadius } from './render/atom-view';
import { BohrView } from './render/bohr-view';
import { PhotonFx } from './render/photon';
import { prewarmAll } from './render/sample-cache';
import { createStage } from './render/scene';
import { store, type AppState } from './state';
import { renderActions } from './ui/actions-panel';
import { renderCard } from './ui/element-card';
import { chargeLabel, escapeHtml, num, superscript } from './ui/format';
import { createHeatmapControls } from './ui/heatmap-controls';
import { renderOrbitalLegend } from './ui/orbital-legend';
import { createPeriodicTable } from './ui/periodic-table';
import { createSearch } from './ui/search';
import { SpectrumPanel } from './ui/spectrum-panel';
import { createHud, segmented } from './ui/viewer-hud';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const viewer = $('viewer');
const stage = createStage(viewer);
const view = new AtomView(stage);
const hud = createHud(viewer);
const bohr = new BohrView(stage, hud.labels);
const photons = new PhotonFx(stage, hud.labels);
const excitation = new Excitation(photons, () => frameRadius(computeAtom(store.get()).orbitals));
excitation.onChange = () => render(store.get());
const spectrum = new SpectrumPanel(hud.bottom);
const expandedSubshells = new Set<string>();

const table = createPeriodicTable($('ptable'), $('category-legend'), (z) => selectElement(z));
createSearch($('search'), (zs) => table.setMatches(zs), (z) => selectElement(z));
createHeatmapControls($('table-tools'), $('heat-legend'), table);

function selectElement(z: number): void {
  if (z === store.get().z) return;
  expandedSubshells.clear();
  excitation.reset();
  store.set({
    z,
    charge: 0,
    isotopeIndex: byZ(z).defaultIsotope,
    hidden: new Set(),
    excited: null,
    lastPhoton: null,
  });
}

/** Radio del núcleo en a₀: el real (R = 1,2 fm·A^⅓) o uno ampliado para verlo */
function nucleusRadius(atom: AtomModel, s: AppState): number {
  const a = atom.protons + atom.neutrons;
  if (s.scale === 'real') return nuclearRadiusFm(a) / BOHR_RADIUS_FM;
  return frameRadius(atom.orbitals) * 0.03;
}

/** Radio del átomo para comparar con el núcleo: el calculado, o el empírico, o el de la nube */
function atomRadiusPm(atom: AtomModel): { pm: number; kind: string } {
  const r = atom.element.radius;
  if (atom.electrons === atom.element.z) {
    if (r.calculated !== null) return { pm: r.calculated, kind: 'radio calculado' };
    if (r.empirical !== null) return { pm: r.empirical, kind: 'radio empírico' };
  }
  const outer = Math.max(...atom.orbitals.map((o) => o.scale * ((3 * o.n * o.n - o.l * (o.l + 1)) / 2)));
  return { pm: outer * BOHR_RADIUS_PM, kind: '⟨r⟩ del orbital más externo, según el modelo' };
}

function renderTitle(atom: AtomModel, s: AppState): void {
  const el = atom.element;
  const a = atom.isotope ? superscript(String(atom.isotope.a)) : '';
  const kind = s.charge > 0 ? 'catión' : s.charge < 0 ? 'anión' : 'átomo neutro';
  hud.title.innerHTML = `
    <div class="hud-symbol">${a}${escapeHtml(chargeLabel(el.symbol, s.charge))}</div>
    <div class="hud-sub">${escapeHtml(el.name)}${atom.isotope ? `-${atom.isotope.a}` : ''} · ${atom.electrons} ${atom.electrons === 1 ? 'electrón' : 'electrones'} · ${kind}</div>`;
  hud.badge.innerHTML =
    s.model === 'bohr'
      ? '<span class="badge badge-bohr">Modelo histórico simplificado (Bohr, 1913)</span>'
      : atom.exact
        ? '<span class="badge badge-exact">Solución exacta de Schrödinger (un electrón, sin relatividad)</span>'
        : '<span class="badge badge-approx" title="Cada electrón se describe con un orbital hidrogenoide y una carga nuclear efectiva (reglas de Slater). La función de onda real de varios electrones no tiene solución exacta.">Aproximación: orbitales hidrogenoides + Z<sub>ef</sub> de Slater</span>';
}

function renderControls(s: AppState): void {
  hud.controls.replaceChildren(
    segmented(
      'Modelo',
      [
        { value: 'quantum', label: 'Cuántico', title: 'Orbitales como nubes de probabilidad' },
        { value: 'bohr', label: 'Bohr', title: 'Modelo histórico de órbitas circulares (1913)' },
      ],
      s.model,
      (model) => store.set({ model }),
    ),
    segmented(
      'Escala',
      [
        { value: 'didactic', label: 'Didáctica', title: 'Núcleo ampliado para que se vea' },
        { value: 'real', label: 'Real', title: 'Núcleo a su tamaño verdadero' },
      ],
      s.scale,
      (scale) => store.set({ scale }),
    ),
    segmented(
      'Subcapas',
      [
        { value: 'hund', label: 'Hund', title: 'Orbitales concretos llenados según la regla de Hund' },
        { value: 'spherical', label: 'Promedio', title: 'Electrones repartidos por igual: nube esférica' },
      ],
      s.occupancy,
      (occupancy) => store.set({ occupancy }),
    ),
    segmented(
      'Color',
      [
        { value: 'sub', label: 'Subcapa' },
        { value: 'phase', label: 'Signo de ψ', title: 'Cálido: ψ > 0 · frío: ψ < 0' },
      ],
      s.phase ? 'phase' : 'sub',
      (v) => store.set({ phase: v === 'phase' }),
    ),
  );
}

function renderScaleInfo(atom: AtomModel, s: AppState): void {
  hud.scaleInfo.hidden = s.scale !== 'real' || s.model !== 'quantum';
  if (hud.scaleInfo.hidden) return;
  const a = atom.protons + atom.neutrons;
  const rNucFm = nuclearRadiusFm(a);
  const { pm, kind } = atomRadiusPm(atom);
  const ratio = (pm * 1000) / rNucFm;
  const pixels = (rNucFm / BOHR_RADIUS_FM / frameRadius(atom.orbitals)) * (stage.height() / 2);
  // Si el átomo midiera 100 m (un campo de fútbol)…
  const mm = (100 / ratio) * 1000;
  hud.scaleInfo.innerHTML = `
    <strong>Escala real.</strong> El núcleo de ${atom.isotope ? superscript(String(a)) : ''}${escapeHtml(atom.element.symbol)} mide unos
    ${num(rNucFm, 1)} fm de radio (R = 1,2 fm·A<sup>1/3</sup>) y el átomo ~${num(pm, 0)} pm (${kind}):
    el átomo es <strong>~${num(Math.round(ratio / 100) * 100, 0)} veces</strong> más grande.
    En pantalla el núcleo ocupa ~${num(pixels, pixels < 0.01 ? 4 : 3)} píxeles, por eso no se ve.
    Si el átomo midiera 100 m, el núcleo sería una bolita de ${num(mm, 1)} mm.
    <span class="muted">Acércate mucho con la rueda o pellizcando y lo encontrarás en el centro.</span>`;
}

function render(s: AppState, prev?: AppState): void {
  const atom = computeAtom(s);
  table.setSelected(s.z);
  renderCard($('card'), atom.element, {
    charge: s.charge,
    isotopeIndex: s.isotopeIndex,
    onIsotope: (i) => store.set({ isotopeIndex: i }),
  });
  renderTitle(atom, s);
  renderControls(s);
  renderOrbitalLegend(hud.legend, atom.orbitals, s.hidden, s.phase, s.occupancy === 'hund', expandedSubshells, (hidden) =>
    store.set({ hidden }),
  );
  renderScaleInfo(atom, s);
  stage.renderer.domElement.setAttribute(
    'aria-label',
    s.model === 'bohr'
      ? `Esquema de Bohr de ${atom.element.name}: ${atom.electrons} electrones en órbitas circulares.`
      : `Nubes de probabilidad de ${atom.element.name}: ${atom.orbitals.length} orbitales ocupados (${[
          ...new Set(atom.orbitals.map((o) => o.subshell)),
        ].join(', ')}).`,
  );
  renderActions(hud.actions, atom, s, excitation);
  spectrum.render(atom, s.charge, s.lastPhoton);
  hud.legend.hidden = s.model !== 'quantum' || atom.electrons === 0;
  bohr.set(atom.shells.length && s.excited && atom.electrons === 1 ? [{ n: s.excited.n, l: s.excited.l, electrons: 1 }] : atom.shells, s.z, frameRadius(atom.orbitals));
  bohr.targetOpacity = s.model === 'bohr' ? 1 : 0;

  view.update({
    orbitals: atom.orbitals,
    hidden: s.hidden,
    phase: s.phase,
    nucleusRadius: nucleusRadius(atom, s),
    protons: atom.protons,
    neutrons: atom.neutrons,
    cloudsOpacity: s.model === 'quantum' ? 1 : 0,
    frameKey: `${s.z}|${s.charge}|${s.excited ? `${s.excited.n}${s.excited.l}` : ''}`,
  });
  if (!prev || prev.z !== s.z) document.title = `${atom.element.name} (${atom.element.symbol}) · Átomos`;
}

store.subscribe(render);
render(store.get());

if (import.meta.env.DEV || new URLSearchParams(location.search).has('fps')) {
  hud.fps.hidden = false;
  setInterval(() => (hud.fps.textContent = `${Math.round(stage.fps())} fps`), 500);
}

// Precalentar la caché de orbitales cuando el navegador esté libre
setTimeout(() => void prewarmAll(), 1200);

// Acceso rápido para pruebas desde la consola
Object.assign(window, { atomos: { store, elements: ELEMENTS, stage, view, excitation } });
