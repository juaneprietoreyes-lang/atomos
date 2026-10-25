import type { OccupancyMode } from './physics/orbitals';
import { createStore } from './ui/store';

export type ScaleMode = 'didactic' | 'real';
export type ModelMode = 'quantum' | 'bohr';
/** Sencillo: menos controles y explicaciones llanas. Completo: todo. */
export type Level = 'sencillo' | 'completo';

export interface AppState {
  /** Número atómico seleccionado */
  z: number;
  /** Carga neta del ion (0 = átomo neutro) */
  charge: number;
  /** Índice en ElementData.isotopes */
  isotopeIndex: number;
  /** Neutrones elegidos a mano en el editor del núcleo (null = los del isótopo) */
  neutrons: number | null;
  level: Level;
  /** Durante el juego: ocultar qué elemento es (título, ficha, selección en la tabla) */
  hideIdentity: boolean;
  scale: ScaleMode;
  occupancy: OccupancyMode;
  /** Colorear por el signo de ψ en vez de por subcapa */
  phase: boolean;
  model: ModelMode;
  /** Orbitales ocultos, por etiqueta («2p_x») */
  hidden: ReadonlySet<string>;
  /** Estado excitado del electrón del hidrógeno (null = fundamental) */
  excited: { n: number; l: number; m: number } | null;
  /** Último fotón emitido o absorbido (para el panel y el espectro) */
  lastPhoton: PhotonEvent | null;
}

export interface PhotonEvent {
  kind: 'emit' | 'absorb' | 'two-photon';
  nLower: number;
  nUpper: number;
  /** Longitud de onda en el vacío (nm) */
  vacuumNm: number;
  /** La que se da en las tablas: en aire entre 200 y 2000 nm, en vacío fuera */
  tableNm: number;
  /** Vida media del estado de partida en segundos (emisión) */
  lifetimeS: number | null;
}

export const store = createStore<AppState>({
  z: 1,
  charge: 0,
  isotopeIndex: 0,
  neutrons: null,
  level: 'completo',
  hideIdentity: false,
  scale: 'didactic',
  occupancy: 'hund',
  phase: false,
  model: 'quantum',
  hidden: new Set(),
  excited: null,
  lastPhoton: null,
});
