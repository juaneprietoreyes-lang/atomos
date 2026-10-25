import { ELEMENTS } from '../data/loader';
import type { ElementData } from '../data/types';
import { escapeHtml, fold } from './format';

/**
 * Búsqueda por nombre (español o inglés, sin tildes), símbolo o número atómico.
 * Resalta las coincidencias en la tabla; Intro elige la primera.
 */
export function createSearch(
  container: HTMLElement,
  onMatches: (zs: Set<number> | null) => void,
  onSelect: (z: number) => void,
): void {
  container.innerHTML = `
    <label class="search-box">
      <span class="search-icon" aria-hidden="true">⌕</span>
      <input type="search" placeholder="Buscar: nombre, símbolo o Z" aria-label="Buscar elemento" autocomplete="off" spellcheck="false" />
      <kbd>/</kbd>
    </label>
    <ul class="search-results" role="listbox" hidden></ul>`;
  const input = container.querySelector('input')!;
  const list = container.querySelector<HTMLUListElement>('.search-results')!;
  let results: ElementData[] = [];
  let active = 0;

  function rank(q: string): ElementData[] {
    const f = fold(q.trim());
    if (!f) return [];
    const scored: [number, ElementData][] = [];
    for (const e of ELEMENTS) {
      const name = fold(e.name);
      const en = fold(e.nameEn);
      const sym = e.symbol.toLowerCase();
      let score = -1;
      if (String(e.z) === f) score = 100;
      else if (sym === f) score = 90;
      else if (name.startsWith(f)) score = 80;
      else if (en.startsWith(f)) score = 70;
      else if (sym.startsWith(f)) score = 60;
      else if (name.includes(f)) score = 50;
      else if (en.includes(f)) score = 40;
      if (score >= 0) scored.push([score, e]);
    }
    return scored.sort((a, b) => b[0] - a[0] || a[1].z - b[1].z).map(([, e]) => e);
  }

  function paintActive(): void {
    list.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('is-active', i === active);
      li.setAttribute('aria-selected', String(i === active));
    });
  }

  function show(): void {
    results = rank(input.value);
    active = 0;
    onMatches(input.value.trim() ? new Set(results.map((e) => e.z)) : null);
    list.hidden = !results.length;
    list.innerHTML = results
      .slice(0, 7)
      .map(
        (e) =>
          `<li role="option" data-z="${e.z}">
            <span class="sr-sym cat-${e.category}">${escapeHtml(e.symbol)}</span>
            <span>${escapeHtml(e.name)}</span><span class="muted">${e.z}</span></li>`,
      )
      .join('');
    paintActive();
  }

  function choose(z: number): void {
    onSelect(z);
    input.value = '';
    show();
    input.blur();
  }

  input.addEventListener('input', show);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && results.length) choose(results[Math.min(active, results.length - 1)].z);
    else if (e.key === 'Escape') {
      input.value = '';
      show();
      input.blur();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const max = Math.min(results.length, 7) - 1;
      active = Math.max(0, Math.min(max, active + (e.key === 'ArrowDown' ? 1 : -1)));
      paintActive();
    }
  });
  list.addEventListener('mousedown', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li[data-z]');
    if (li) {
      e.preventDefault();
      choose(Number(li.dataset.z));
    }
  });
  input.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 120));
  input.addEventListener('focus', () => {
    if (results.length) list.hidden = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      input.focus();
    }
  });
}
