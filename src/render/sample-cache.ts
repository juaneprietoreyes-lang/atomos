import type { OrbitalSample } from '../physics/sampling';
import type { SampleRequest, SampleResponse } from '../workers/sampler.worker';

/**
 * Caché de nubes por (n, l, m). Cada entrada guarda MAX_POINTS muestras
 * independientes; para dibujar menos basta con usar las primeras (cualquier
 * prefijo de muestras i.i.d. es otra muestra válida). Z_eff no entra en la
 * clave: solo escala la nube.
 */
export const MAX_POINTS = 40000;

const cache = new Map<string, OrbitalSample>();
const pending = new Map<string, Promise<OrbitalSample>>();
const waiting = new Map<number, (s: OrbitalSample) => void>();
let nextId = 1;
const workers: Worker[] = [];
let rr = 0;

function worker(): Worker {
  if (!workers.length) {
    // Dos workers: uno puede estar precalentando mientras el otro atiende lo urgente
    const count = Math.min(2, Math.max(1, (navigator.hardwareConcurrency ?? 2) - 1));
    for (let i = 0; i < count; i++) {
      const w = new Worker(new URL('../workers/sampler.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (ev: MessageEvent<SampleResponse>) => {
        const done = waiting.get(ev.data.id);
        waiting.delete(ev.data.id);
        done?.({ positions: ev.data.positions, signs: ev.data.signs });
      };
      workers.push(w);
    }
  }
  return workers[rr++ % workers.length];
}

export const sampleKey = (n: number, l: number, m: number): string => `${n},${l},${m}`;

export function cachedSample(n: number, l: number, m: number): OrbitalSample | undefined {
  return cache.get(sampleKey(n, l, m));
}

export function getSample(n: number, l: number, m: number): Promise<OrbitalSample> {
  const key = sampleKey(n, l, m);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const p = new Promise<OrbitalSample>((resolve) => {
    const id = nextId++;
    waiting.set(id, (s) => {
      cache.set(key, s);
      pending.delete(key);
      resolve(s);
    });
    const req: SampleRequest = { id, n, l, m, count: MAX_POINTS };
    worker().postMessage(req);
  });
  pending.set(key, p);
  return p;
}

/** Calienta la caché con todos los orbitales posibles hasta el 7p, sin prisa */
export async function prewarmAll(): Promise<void> {
  for (let n = 1; n <= 7; n++)
    for (let l = 0; l < Math.min(n, 4); l++) {
      if (n + l > 8) continue;
      for (let m = -l; m <= l; m++) await getSample(n, l, m);
    }
}

export const cacheSize = (): number => cache.size;
