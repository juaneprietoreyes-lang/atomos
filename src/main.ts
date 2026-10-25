import './styles.css';
import { computeAtom, type AtomModel } from './atom-model';
import { byZ, ELEMENTS } from './data/loader';
import { Excitation } from './excitation';
import { ionConfiguration } from './physics/configuration';
import { BOHR_RADIUS_FM, BOHR_RADIUS_PM } from './physics/constants';
import { nuclearRadiusFm } from './physics/nucleus';
import { shakeIntensity } from './physics/stability';
import { AtomView, frameRadius } from './render/atom-view';
import { BohrView } from './render/bohr-view';
import { PhotonFx } from './render/photon';
import { prewarmAll } from './render/sample-cache';
import { createStage } from './render/scene';
import { store, type AppState, type Level } from './state';
import { renderActions } from './ui/actions-panel';
import { renderCard } from './ui/element-card';
import { chargeLabel, escapeHtml, num, superscript } from './ui/format';
import { GamePanel } from './ui/game-panel';
import { createHeatmapControls } from './ui/heatmap-controls';
import { renderOrbitalLegend } from './ui/orbital-legend';
import { createPeriodicTable } from './ui/periodic-table';
import { createSearch } from './ui/search';
import { shake } from './ui/shake';
import { renderParticles, renderSimpleCard } from './ui/simple-view';
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

const table = createPeriodicTable($('ptable'), $('category-legend'), (z) => onTablePick(z));
createSearch($('search'), (zs) => table.setMatches(zs), (z) => onTablePick(z));
createHeatmapControls($('table-tools'), $('heat-legend'), table);

// --- Nivel (sencillo / completo), recordado en este navegador
const LEVEL_KEY = 'atomos-nivel';
try {
  const saved = localStorage.getItem(LEVEL_KEY);
  if (saved === 'sencillo' || saved === 'completo') store.set({ level: saved });
} catch {
  // sin almacenamiento: se queda el nivel por defecto
}

// --- Juego
let beforeGame: AppState | null = null;
const game = new GamePanel($('game'), table, {
  level: () => store.get().level,
  apply(v) {
    excitation.reset();
    expandedSubshells.clear();
    store.set(v);
  },
  restore() {
    excitation.reset();
    if (beforeGame) store.set({ ...beforeGame, hideIdentity: false });
    beforeGame = null;
  },
  onActiveChange(active) {
    $('card').hidden = active;
    render(store.get());
  },
});

function startGame(): void {
  if (!game.active) beforeGame = store.get();
  game.start();
}

function onTablePick(z: number): void {
  if (game.answerTable(z)) return;
  selectElement(z);
}

function selectElement(z: number): void {
  if (z === store.get().z && store.get().neutrons === null) return;
  expandedSubshells.clear();
  excitation.reset();
  store.set({
    z,
    charge: 0,
    isotopeIndex: byZ(z).defaultIsotope,
    neutrons: null,
    hidden: new Set(),
    excited: null,
    lastPhoton: null,
  });
}

/** Editor del núcleo: los protones cambian el elemento; los neutrones, el isótopo */
const nucleusEditor = {
  setProtons(z: number) {
    const s = store.get();
    if (z < 1 || z > 118) return;
    const neutrons = computeAtom(s).neutrons;
    const el = byZ(z);
    let charge = Math.min(s.charge, z);
    try {
      ionConfiguration(el.configuration.shells, charge);
    } catch {
      charge = 0;
    }
    const iso = el.isotopes.findIndex((i) => i.neutrons === neutrons);
    expandedSubshells.clear();
    excitation.reset();
    store.set({
      z,
      neutrons,
      charge,
      isotopeIndex: iso >= 0 ? iso : el.defaultIsotope,
      hidden: new Set(),
      excited: null,
      lastPhoton: null,
    });
  },
  setNeutrons(n: number) {
    const s = store.get();
    if (n < 0) return;
    const iso = byZ(s.z).isotopes.findIndex((i) => i.neutrons === n);
    store.set({ neutrons: n, isotopeIndex: iso >= 0 ? iso : s.isotopeIndex });
  },
};

/** Radio del núcleo en a₀: el real (R = 1,2 fm·A^⅓) o uno ampliado para verlo */
function nucleusRadius(atom: AtomModel, s: AppState): number {
  if (s.scale === 'real') return nuclearRadiusFm(atom.massNumber) / BOHR_RADIUS_FM;
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

function renderTopTools(s: AppState): void {
  const tools = $('top-tools');
  tools.replaceChildren(
    segmented<Level>(
      'Nivel',
      [
        { value: 'sencillo', label: 'Sencillo', title: 'Lo básico: protones, neutrones, electrones y capas' },
        { value: 'completo', label: 'Completo', title: 'Todo: orbitales, Z efectiva, espectros…' },
      ],
      s.level,
      (level) => {
        try {
          localStorage.setItem(LEVEL_KEY, level);
        } catch {
          // sin almacenamiento
        }
        store.set({ level });
        // Si se está jugando, la ronda empieza de nuevo con preguntas del otro nivel
        if (game.active) game.start();
      },
    ),
  );
  const play = document.createElement('button');
  play.type = 'button';
  play.className = `btn ${game.active ? 'btn-ghost' : 'btn-primary'}`;
  play.textContent = game.active ? 'Salir del juego' : '🎮 Jugar';
  play.addEventListener('click', () => (game.active ? game.exit() : startGame()));
  tools.append(play);
}

function renderTitle(atom: AtomModel, s: AppState): void {
  const el = atom.element;
  if (s.hideIdentity) {
    hud.title.innerHTML = `<div class="hud-symbol">?</div><div class="hud-sub">Elemento misterioso</div>`;
  } else {
    const kind = s.charge > 0 ? 'catión' : s.charge < 0 ? 'anión' : 'átomo neutro';
    hud.title.innerHTML = `
      <div class="hud-symbol">${superscript(String(atom.massNumber))}${escapeHtml(chargeLabel(el.symbol, s.charge))}</div>
      <div class="hud-sub">${escapeHtml(el.name)}-${atom.massNumber} · ${atom.electrons} ${atom.electrons === 1 ? 'electrón' : 'electrones'} · ${kind}</div>`;
  }
  const simple = s.level === 'sencillo';
  hud.badge.innerHTML =
    s.model === 'bohr'
      ? '<span class="badge badge-bohr">Modelo histórico simplificado (Bohr, 1913)</span>'
      : simple
        ? '<span class="badge badge-exact">Nube de electrones: donde más brilla, más probable es encontrarlos</span>'
        : atom.exact
          ? '<span class="badge badge-exact">Solución exacta de Schrödinger (un electrón, sin relatividad)</span>'
          : '<span class="badge badge-approx" title="Cada electrón se describe con un orbital hidrogenoide y una carga nuclear efectiva (reglas de Slater). La función de onda real de varios electrones no tiene solución exacta.">Aproximación: orbitales hidrogenoides + Z<sub>ef</sub> de Slater</span>';
}

function renderControls(s: AppState): void {
  const controls = [
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
  ];
  if (s.level === 'completo')
    controls.push(
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
  hud.controls.replaceChildren(...controls);
}

function renderScaleInfo(atom: AtomModel, s: AppState): void {
  hud.scaleInfo.hidden = s.scale !== 'real' || s.model !== 'quantum' || s.hideIdentity;
  if (hud.scaleInfo.hidden) return;
  const rNucFm = nuclearRadiusFm(atom.massNumber);
  const { pm, kind } = atomRadiusPm(atom);
  const ratio = (pm * 1000) / rNucFm;
  const pixels = (rNucFm / BOHR_RADIUS_FM / frameRadius(atom.orbitals)) * (stage.height() / 2);
  // Si el átomo midiera 100 m (un campo de fútbol)…
  const mm = (100 / ratio) * 1000;
  hud.scaleInfo.innerHTML = `
    <strong>Escala real.</strong> El núcleo de ${superscript(String(atom.massNumber))}${escapeHtml(atom.element.symbol)} mide unos
    ${num(rNucFm, 1)} fm de radio (R = 1,2 fm·A<sup>1/3</sup>) y el átomo ~${num(pm, 0)} pm (${kind}):
    el átomo es <strong>~${num(Math.round(ratio / 100) * 100, 0)} veces</strong> más grande.
    En pantalla el núcleo ocupa ~${num(pixels, pixels < 0.01 ? 4 : 3)} píxeles, por eso no se ve.
    Si el átomo midiera 100 m, el núcleo sería una bolita de ${num(mm, 1)} mm.
    <span class="muted">Acércate mucho con la rueda o pellizcando y lo encontrarás en el centro.</span>`;
}

function render(s: AppState, prev?: AppState): void {
  const atom = computeAtom(s);
  const simple = s.level === 'sencillo';
  table.setSelected(s.hideIdentity ? 0 : s.z);

  if (!game.active) {
    const onIsotope = (i: number) => store.set({ isotopeIndex: i, neutrons: null });
    if (simple) renderSimpleCard($('card'), atom, s.charge, onIsotope);
    else
      renderCard($('card'), atom.element, {
        charge: s.charge,
        isotopeIndex: s.isotopeIndex,
        drawnMassNumber: atom.massNumber,
        onIsotope,
      });
  }
  renderTopTools(s);
  renderTitle(atom, s);
  renderControls(s);
  if (simple) renderParticles(hud.legend, atom);
  else
    renderOrbitalLegend(hud.legend, atom.orbitals, s.hidden, s.phase, s.occupancy === 'hund', expandedSubshells, (hidden) =>
      store.set({ hidden }),
    );
  renderScaleInfo(atom, s);
  stage.renderer.domElement.setAttribute(
    'aria-label',
    s.hideIdentity
      ? 'Átomo misterioso del juego.'
      : s.model === 'bohr'
        ? `Esquema de Bohr de ${atom.element.name}: ${atom.electrons} electrones en órbitas circulares.`
        : `Nubes de probabilidad de ${atom.element.name}: ${atom.orbitals.length} orbitales ocupados (${[
            ...new Set(atom.orbitals.map((o) => o.subshell)),
          ].join(', ')}).`,
  );
  renderActions(hud.actions, atom, s, excitation, nucleusEditor, simple);
  hud.actions.hidden = s.hideIdentity;
  if (!simple) spectrum.render(atom, s.charge, s.lastPhoton);
  hud.bottom.hidden = simple || s.hideIdentity;
  hud.legend.hidden = s.hideIdentity || (!simple && (s.model !== 'quantum' || atom.electrons === 0));
  bohr.set(
    atom.shells.length && s.excited && atom.electrons === 1 ? [{ n: s.excited.n, l: s.excited.l, electrons: 1 }] : atom.shells,
    s.z,
    frameRadius(atom.orbitals),
  );
  bohr.targetOpacity = s.model === 'bohr' ? 1 : 0;

  const instability = s.hideIdentity ? 0 : shakeIntensity(atom.stability);
  bohr.jitter = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : instability;
  view.update({
    orbitals: atom.orbitals,
    hidden: s.hidden,
    phase: s.phase && !simple,
    nucleusRadius: nucleusRadius(atom, s),
    protons: atom.protons,
    neutrons: atom.neutrons,
    instability,
    cloudsOpacity: s.model === 'quantum' ? 1 : 0,
    frameKey: `${s.z}|${s.charge}|${s.excited ? `${s.excited.n}${s.excited.l}` : ''}`,
  });

  // Núcleo inestable recién creado (o recién desvelado en el juego): tiembla la pantalla
  if (prev && instability > 0) {
    const prevAtom = computeAtom(prev);
    const changed = prevAtom.protons !== atom.protons || prevAtom.neutrons !== atom.neutrons;
    if (changed || (prev.hideIdentity && !s.hideIdentity)) shake($('main'), instability);
  }

  document.title = s.hideIdentity ? 'Reto · Átomos' : `${atom.element.name} (${atom.element.symbol}) · Átomos`;
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
Object.assign(window, { atomos: { store, elements: ELEMENTS, stage, view, excitation, game } });
