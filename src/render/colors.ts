import * as THREE from 'three';

/**
 * Color de cada subcapa: el tono indica l (s azul, p naranja, d verde, f violeta)
 * y la luminosidad crece con n. La leyenda usa los mismos valores.
 */
const HUE: Record<number, number> = { 0: 0.57, 1: 0.065, 2: 0.37, 3: 0.79, 4: 0.13 };

export function subshellColor(n: number, l: number): THREE.Color {
  const light = Math.min(0.74, 0.5 + (n - 1) * 0.04);
  return new THREE.Color().setHSL(HUE[l] ?? 0, 0.78, light);
}

export const subshellCss = (n: number, l: number): string => `#${subshellColor(n, l).getHexString()}`;

/** Modo sencillo: un color por capa (K azul, L verde, M amarillo, N naranja, O rosa, P violeta, Q cian) */
const SHELL_HEX = ['#5aa9ff', '#5fe08a', '#ffd84d', '#ff9a4a', '#ff6fa8', '#b58cff', '#4fe3e0', '#cfd8e8'];
export const shellCss = (n: number): string => SHELL_HEX[n - 1] ?? '#cfd8e8';
export const shellColor = (n: number): THREE.Color => new THREE.Color(shellCss(n));

/** Fase de ψ: lóbulos positivos cálidos, negativos fríos (convención habitual) */
export const PHASE_POSITIVE = new THREE.Color('#ff9a62');
export const PHASE_NEGATIVE = new THREE.Color('#5fb2ff');

export const PROTON_COLOR = new THREE.Color('#ff6b5e');
export const NEUTRON_COLOR = new THREE.Color('#9aa7bd');
