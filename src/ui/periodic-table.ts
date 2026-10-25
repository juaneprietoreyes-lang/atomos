import { ELEMENTS, CATEGORY_LABELS } from '../data/loader';
import type { Category } from '../data/types';
import { escapeHtml } from './format';
import { heatColor } from './heat-color';

export interface PeriodicTable {
  setSelected(z: number): void;
  /** Mapa de calor: valor normalizado 0–1 por Z (null = dato desconocido). null quita el mapa. */
  setHeatmap(values: Map<number, number | null> | null): void;
  /** Resalta las coincidencias de una búsqueda (null = sin filtro) */
  setMatches(zs: Set<number> | null): void;
  /** Destello verde o rojo en una casilla (respuestas del juego) */
  flash(z: number, kind: 'ok' | 'bad'): void;
}

export function createPeriodicTable(
  container: HTMLElement,
  legend: HTMLElement,
  onSelect: (z: number) => void,
): PeriodicTable {
  const cells = new Map<number, HTMLButtonElement>();

  for (const el of ELEMENTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `el cat-${el.category}`;
    b.style.gridColumn = String(el.x);
    b.style.gridRow = String(el.y);
    b.dataset.z = String(el.z);
    b.title = `${el.name} (${el.symbol}) · Z = ${el.z}`;
    b.setAttribute('aria-label', `${el.name}, ${el.symbol}, número atómico ${el.z}`);
    b.innerHTML = `<span class="el-z">${el.z}</span><span class="el-sym">${escapeHtml(el.symbol)}</span>`;
    b.addEventListener('click', () => onSelect(el.z));
    cells.set(el.z, b);
    container.append(b);
  }

  // Huecos del grupo 3 que remiten a las filas de lantánidos y actínidos
  for (const [row, label, cat] of [
    [6, '57–71', 'lantanido'],
    [7, '89–103', 'actinido'],
  ] as const) {
    const p = document.createElement('div');
    p.className = `el-placeholder cat-${cat}`;
    p.style.gridColumn = '3';
    p.style.gridRow = String(row);
    p.textContent = label;
    p.setAttribute('aria-hidden', 'true');
    container.append(p);
  }

  // Navegación con flechas por la rejilla
  container.addEventListener('keydown', (ev) => {
    const target = ev.target as HTMLElement;
    const z = Number(target.dataset.z);
    if (!z) return;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const d = deltas[ev.key];
    if (!d) return;
    ev.preventDefault();
    const cur = ELEMENTS[z - 1];
    let best: { z: number; dist: number } | null = null;
    for (const e of ELEMENTS) {
      const dx = e.x - cur.x;
      const dy = e.y - cur.y;
      // Solo los que están en la dirección pedida
      if (d[0] !== 0 && (Math.sign(dx) !== d[0] || dy !== 0)) continue;
      if (d[1] !== 0 && (Math.sign(dy) !== d[1] || Math.abs(dx) > 0)) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (!best || dist < best.dist) best = { z: e.z, dist };
    }
    if (best) cells.get(best.z)?.focus();
  });

  legend.innerHTML = (Object.keys(CATEGORY_LABELS) as Category[])
    .map((c) => `<span class="legend-item"><i class="swatch cat-${c}"></i>${CATEGORY_LABELS[c]}</span>`)
    .join('');

  let selected = 0;
  return {
    setSelected(z) {
      cells.get(selected)?.classList.remove('is-selected');
      cells.get(selected)?.removeAttribute('aria-current');
      selected = z;
      cells.get(z)?.classList.add('is-selected');
      cells.get(z)?.setAttribute('aria-current', 'true');
    },
    setHeatmap(values) {
      container.classList.toggle('heatmap', values !== null);
      legend.hidden = values !== null;
      for (const [z, cell] of cells) {
        const v = values?.get(z);
        cell.classList.toggle('heat-unknown', values !== null && (v === null || v === undefined));
        if (values !== null && v !== null && v !== undefined) {
          const c = heatColor(v);
          cell.style.setProperty('--heat-bg', c.bg);
          cell.style.setProperty('--heat-fg', c.fg);
        } else {
          cell.style.removeProperty('--heat-bg');
          cell.style.removeProperty('--heat-fg');
        }
      }
    },
    setMatches(zs) {
      container.classList.toggle('filtering', zs !== null);
      for (const [z, cell] of cells) cell.classList.toggle('is-match', zs?.has(z) ?? false);
    },
    flash(z, kind) {
      const cell = cells.get(z);
      if (!cell) return;
      cell.classList.remove('flash-ok', 'flash-bad');
      void cell.offsetWidth; // reinicia la animación
      cell.classList.add(kind === 'ok' ? 'flash-ok' : 'flash-bad');
      setTimeout(() => cell.classList.remove('flash-ok', 'flash-bad'), 2600);
    },
  };
}
