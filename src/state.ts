import { createStore } from './ui/store';

export interface AppState {
  /** Número atómico seleccionado */
  z: number;
  /** Carga neta del ion (0 = átomo neutro) */
  charge: number;
  /** Índice en ElementData.isotopes */
  isotopeIndex: number;
}

export const store = createStore<AppState>({ z: 1, charge: 0, isotopeIndex: 0 });
