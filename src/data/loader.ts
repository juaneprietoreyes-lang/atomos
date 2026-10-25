import elementsJson from './elements.json';
import spectraJson from './spectra.json';
import type { Category, ElementData, SpectraData } from './types';

export const ELEMENTS = elementsJson as ElementData[];
export const SPECTRA = spectraJson as SpectraData;

export const byZ = (z: number): ElementData => {
  const e = ELEMENTS[z - 1];
  if (!e || e.z !== z) throw new Error(`Elemento ${z} no encontrado`);
  return e;
};

export const CATEGORY_LABELS: Record<Category, string> = {
  alcalino: 'Metales alcalinos',
  alcalinoterreo: 'Metales alcalinotérreos',
  transicion: 'Metales de transición',
  lantanido: 'Lantánidos',
  actinido: 'Actínidos',
  postransicion: 'Otros metales (bloque p)',
  metaloide: 'Metaloides',
  'no-metal': 'No metales',
  halogeno: 'Halógenos',
  'gas-noble': 'Gases nobles',
};

/** Singular para la ficha */
export const CATEGORY_SINGULAR: Record<Category, string> = {
  alcalino: 'Metal alcalino',
  alcalinoterreo: 'Metal alcalinotérreo',
  transicion: 'Metal de transición',
  lantanido: 'Lantánido',
  actinido: 'Actínido',
  postransicion: 'Metal del bloque p',
  metaloide: 'Metaloide',
  'no-metal': 'No metal',
  halogeno: 'Halógeno',
  'gas-noble': 'Gas noble',
};
