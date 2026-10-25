/// <reference lib="webworker" />
/**
 * Muestrea orbitales fuera del hilo principal para no bloquear la interfaz.
 * Recibe peticiones (n, l, m, count) y devuelve las posiciones reducidas (Z = 1)
 * y los signos de ψ como buffers transferibles.
 */
import { sampleOrbital } from '../physics/sampling';

export interface SampleRequest {
  id: number;
  n: number;
  l: number;
  m: number;
  count: number;
}

export interface SampleResponse {
  id: number;
  positions: Float32Array;
  signs: Int8Array;
  ms: number;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (ev: MessageEvent<SampleRequest>) => {
  const { id, n, l, m, count } = ev.data;
  const t0 = performance.now();
  const { positions, signs } = sampleOrbital(n, l, m, count);
  const res: SampleResponse = { id, positions, signs, ms: performance.now() - t0 };
  ctx.postMessage(res, [positions.buffer, signs.buffer]);
};
