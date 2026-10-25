import { NUCLEAR_R0_FM } from './constants';
import { hashSeed, mulberry32 } from './random';

/** Radio nuclear empírico R = r₀·A^(1/3), con r₀ = 1,2 fm */
export const nuclearRadiusFm = (massNumber: number): number => NUCLEAR_R0_FM * Math.cbrt(massNumber);

export interface PackedNucleus {
  /** Centros de los nucleones (x, y, z), en unidades del radio de un nucleón */
  positions: Float32Array;
  /** true = protón, false = neutrón */
  isProton: boolean[];
  /** Radio del conjunto (mismas unidades) */
  radius: number;
}

/**
 * Empaqueta Z protones y N neutrones como esferas rígidas de radio 1 que se
 * atraen hacia el centro y no se solapan (relajación determinista). Es una
 * imagen didáctica: el núcleo real no es un racimo de bolas (ver README).
 */
export function packNucleus(protons: number, neutrons: number): PackedNucleus {
  const count = protons + neutrons;
  const rand = mulberry32(hashSeed(`nucleo-${protons}-${neutrons}`));
  const pos = new Float64Array(count * 3);
  // Arranque: puntos al azar dentro de una esfera algo mayor que la final
  const r0 = 1.25 * Math.cbrt(count);
  for (let i = 0; i < count; i++) {
    for (;;) {
      const x = 2 * rand() - 1;
      const y = 2 * rand() - 1;
      const z = 2 * rand() - 1;
      if (x * x + y * y + z * z <= 1) {
        pos[i * 3] = x * r0;
        pos[i * 3 + 1] = y * r0;
        pos[i * 3 + 2] = z * r0;
        break;
      }
    }
  }
  const iterations = count > 150 ? 70 : 110;
  for (let it = 0; it < iterations; it++) {
    const pull = 0.06 * (1 - it / iterations);
    for (let i = 0; i < count; i++) {
      pos[i * 3] *= 1 - pull;
      pos[i * 3 + 1] *= 1 - pull;
      pos[i * 3 + 2] *= 1 - pull;
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[j * 3] - pos[i * 3];
        const dy = pos[j * 3 + 1] - pos[i * 3 + 1];
        const dz = pos[j * 3 + 2] - pos[i * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= 4) continue; // distancia ≥ 2 radios: no se tocan
        const d = Math.sqrt(d2) || 1e-6;
        const push = (2 - d) / 2 / d;
        pos[i * 3] -= dx * push;
        pos[i * 3 + 1] -= dy * push;
        pos[i * 3 + 2] -= dz * push;
        pos[j * 3] += dx * push;
        pos[j * 3 + 1] += dy * push;
        pos[j * 3 + 2] += dz * push;
      }
    }
  }
  // Protones y neutrones mezclados al azar (con semilla)
  const isProton = Array.from({ length: count }, (_, i) => i < protons);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [isProton[i], isProton[j]] = [isProton[j], isProton[i]];
  }
  let radius = 0;
  for (let i = 0; i < count; i++) radius = Math.max(radius, Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]) + 1);
  return { positions: Float32Array.from(pos), isProton, radius };
}
