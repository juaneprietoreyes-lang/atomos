import { ELEMENTS } from '../data/loader';
import type { ElementData } from '../data/types';
import { num } from './format';
import { heatColor } from './heat-color';
import type { PeriodicTable } from './periodic-table';
import { segmented } from './viewer-hud';

type Property = 'category' | 'electronegativity' | 'radius' | 'ionization';

const PROPS: Record<Exclude<Property, 'category'>, { label: string; unit: string; note: string; get: (e: ElementData) => number | null }> = {
  electronegativity: {
    label: 'Electronegatividad',
    unit: 'Pauling',
    note: 'Escala de Pauling. Gris rayado: sin dato.',
    get: (e) => e.electronegativity,
  },
  radius: {
    label: 'Radio atómico',
    unit: 'pm',
    note: 'Radio calculado (Clementi et al., 1967), el mismo método para todos; no existe para Z > 86.',
    get: (e) => e.radius.calculated,
  },
  ionization: {
    label: 'Energía de ionización',
    unit: 'eV',
    note: '1ª energía de ionización (NIST). Incluye valores calculados o extrapolados de los más pesados; gris rayado: desconocida.',
    get: (e) => e.ionizationEnergy?.eV ?? null,
  },
};

/** Selector «Colorear por…» de la tabla y su leyenda de gradiente */
export function createHeatmapControls(
  container: HTMLElement,
  gradientLegend: HTMLElement,
  table: PeriodicTable,
): { setVisible(visible: boolean): void } {
  let current: Property = 'category';

  function apply(): void {
    container.replaceChildren(
      segmented<Property>(
        'Colorear por',
        [
          { value: 'category', label: 'Categoría' },
          { value: 'electronegativity', label: 'Electroneg.', title: 'Electronegatividad (Pauling)' },
          { value: 'radius', label: 'Radio' },
          { value: 'ionization', label: 'E. ionización', title: '1ª energía de ionización' },
        ],
        current,
        (v) => {
          current = v;
          apply();
        },
      ),
    );
    if (current === 'category') {
      table.setHeatmap(null);
      gradientLegend.hidden = true;
      return;
    }
    const p = PROPS[current];
    const values = ELEMENTS.map((e) => p.get(e));
    const known = values.filter((v): v is number => v !== null);
    const min = Math.min(...known);
    const max = Math.max(...known);
    table.setHeatmap(new Map(ELEMENTS.map((e, i) => [e.z, values[i] === null ? null : (values[i]! - min) / (max - min)])));
    const stops = Array.from({ length: 11 }, (_, i) => heatColor(i / 10).bg).join(', ');
    gradientLegend.hidden = false;
    gradientLegend.innerHTML = `
      <div class="grad-bar" style="background:linear-gradient(90deg, ${stops})"></div>
      <div class="grad-scale"><span>${num(min, 2)} ${p.unit}</span><span>${p.label}</span><span>${num(max, 2)} ${p.unit}</span></div>
      <p class="grad-note">${p.note} Hay ${ELEMENTS.length - known.length} elementos sin dato.</p>`;
  }
  apply();
  return {
    // En el modo sencillo no hay mapa de calor: se vuelve a los colores por familia
    setVisible(visible) {
      container.hidden = !visible;
      if (!visible && current !== 'category') {
        current = 'category';
        apply();
      }
    },
  };
}
