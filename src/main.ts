import './styles.css';
import { byZ, ELEMENTS } from './data/loader';
import { store } from './state';
import { renderCard } from './ui/element-card';
import { createPeriodicTable } from './ui/periodic-table';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const table = createPeriodicTable($('ptable'), $('category-legend'), (z) =>
  store.set({ z, charge: 0, isotopeIndex: byZ(z).defaultIsotope }),
);

function render(): void {
  const { z, charge, isotopeIndex } = store.get();
  const el = byZ(z);
  table.setSelected(z);
  renderCard($('card'), el, { charge, isotopeIndex, onIsotope: (i) => store.set({ isotopeIndex: i }) });
  document.title = `${el.name} (${el.symbol}) · Átomos`;
}

$('viewer').innerHTML =
  '<p style="position:absolute;inset:auto 0 50% 0;text-align:center;color:var(--muted)">El visor 3D llega en la fase 3.</p>';

store.subscribe(render);
render();

// Acceso rápido para pruebas desde la consola
Object.assign(window, { atomos: { store, elements: ELEMENTS } });
