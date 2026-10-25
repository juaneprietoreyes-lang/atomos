import type { Subshell } from '../physics/configuration';

/**
 * Esquema de src/data/elements.json (generado por scripts/build-data.ts).
 * Regla del proyecto: un dato que no existe o es incierto va como null o con su
 * marca («predicho», «estimado»); nunca se rellena con un valor inventado.
 */

export type Category =
  | 'alcalino'
  | 'alcalinoterreo'
  | 'transicion'
  | 'lantanido'
  | 'actinido'
  | 'postransicion'
  | 'metaloide'
  | 'no-metal'
  | 'halogeno'
  | 'gas-noble';

export type Phase = 'sólido' | 'líquido' | 'gas';

export interface Isotope {
  /** Número másico A */
  a: number;
  neutrons: number;
  /** Masa atómica en u */
  mass: number;
  /** Abundancia natural en % (null si no aparece en la naturaleza) */
  abundance: number | null;
  stable: boolean;
  /** Semivida en segundos (null si es estable o desconocida) */
  halfLifeSeconds: number | null;
  /** Semivida tal como la da ENSDF, para mostrarla: «4,2·10⁶ a» */
  halfLifeText: string | null;
}

export interface ElementData {
  z: number;
  symbol: string;
  name: string;
  nameEn: string;
  /** Masa atómica estándar (u). Si no hay isótopos naturales, bracketMassNumber trae el A del más estable. */
  atomicMass: number | null;
  bracketMassNumber: number | null;
  configuration: {
    shells: Subshell[];
    text: string;
    source: 'NIST' | 'PubChem';
    /** Z ≥ 104: solo hay cálculos teóricos */
    predicted: boolean;
    /** Difiere de lo que predice la regla de Madelung (Cr, Cu, Pd, Au…) */
    madelungException: boolean;
  };
  category: Category;
  categoryPredicted: boolean;
  group: number | null;
  period: number;
  block: 's' | 'p' | 'd' | 'f';
  /** Posición en la rejilla de la tabla: columnas 1–18; filas 1–7 y 9–10 (lantánidos/actínidos) */
  x: number;
  y: number;
  electronegativity: number | null;
  /** Valor de otra tabla (PubChem) cuando difiere en más de 0,05 */
  electronegativityAlt: number | null;
  ionizationEnergy: {
    eV: number;
    uncertainty: number | null;
    /** NIST: sin marca = medida; ( ) = semiempírica; [ ] = teórica */
    quality: 'medida' | 'semiempírica' | 'teórica';
  } | null;
  /** Radios en pm, cada uno de su fuente/método; null si no se conoce */
  radius: {
    calculated: number | null;
    empirical: number | null;
    covalent: number | null;
    vanDerWaals: number | null;
  };
  /** alternative: lo que predice otra fuente cuando no coinciden */
  phase: { value: Phase; predicted: boolean; alternative: Phase | null } | null;
  isotopes: Isotope[];
  /** Índice en isotopes del que se usa por defecto (más abundante o de mayor semivida) */
  defaultIsotope: number;
}

export interface SpectralLine {
  /** Longitud de onda en aire, nm (NIST, 200–2000 nm) */
  nm: number;
  /** Intensidad relativa de NIST (escala propia de cada espectro) */
  intensity: number;
}

export type SpectraData = Record<string, SpectralLine[]>;
