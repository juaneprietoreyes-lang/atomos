import * as THREE from 'three';
import { computeAtom } from './atom-model';
import {
  decayChannels,
  lifetime,
  lineName,
  nuclearMassFromAtomic,
  tableWavelengthNm,
  vacuumWavelengthNm,
} from './physics/hydrogen';
import { wavelengthToRgb } from './physics/wavelength-color';
import type { PhotonFx } from './render/photon';
import { store, type PhotonEvent } from './state';
import { num } from './ui/format';

/**
 * Excitación y desexcitación de un átomo de un electrón (H, He⁺, Li²⁺…).
 * - Absorber: desde el estado actual solo se llega a l ± 1 (regla de selección).
 * - Emitir: el salto se sortea con las probabilidades de los coeficientes de
 *   Einstein A calculados, no al azar uniforme.
 * La animación va muy ralentizada: las vidas medias reales son de nanosegundos.
 */
export class Excitation {
  private busy = false;
  /** Cambia con cada reset: un fotón en vuelo de otro átomo ya no aplica su efecto */
  private epoch = 0;
  private autoTimer: number | undefined;
  auto = false;
  onChange: () => void = () => {};

  constructor(
    private readonly fx: PhotonFx,
    private readonly radius: () => number,
  ) {}

  /** Estado actual del electrón */
  current(): { n: number; l: number; m: number } {
    return store.get().excited ?? { n: 1, l: 0, m: 0 };
  }

  private context() {
    const s = store.get();
    const atom = computeAtom(s);
    const mass = nuclearMassFromAtomic(atom.atomicMassU, s.z);
    return { z: s.z, mass, oneElectron: atom.electrons === 1 };
  }

  isBusy(): boolean {
    return this.busy;
  }

  /** Niveles a los que se puede subir absorbiendo un fotón */
  targets(maxN = 7): number[] {
    const c = this.current();
    return Array.from({ length: maxN - c.n }, (_, i) => c.n + 1 + i);
  }

  absorbWavelength(nUp: number): { vacuumNm: number; tableNm: number } {
    const { z, mass } = this.context();
    const c = this.current();
    return { vacuumNm: vacuumWavelengthNm(c.n, nUp, z, mass), tableNm: tableWavelengthNm(c.n, nUp, z, mass) };
  }

  absorb(nUp: number): void {
    const ctx = this.context();
    if (this.busy || !ctx.oneElectron) return;
    const c = this.current();
    // Δl = ±1: se sube a l+1 si cabe en el nuevo nivel; si no, a l−1
    const l = c.l + 1 < nUp ? c.l + 1 : c.l - 1;
    if (l < 0) return;
    const { vacuumNm, tableNm } = this.absorbWavelength(nUp);
    const ev: PhotonEvent = { kind: 'absorb', nLower: c.n, nUpper: nUp, vacuumNm, tableNm, lifetimeS: null };
    this.busy = true;
    this.onChange();
    const epoch = this.epoch;
    this.fx.launch({
      direction: 'absorb',
      nm: vacuumNm,
      color: this.color(tableNm),
      label: this.label(ev),
      radius: this.radius(),
      onDone: () => {
        if (epoch !== this.epoch) return;
        this.busy = false;
        store.set({ excited: { n: nUp, l, m: 0 }, lastPhoton: ev });
        this.scheduleAuto();
      },
    });
  }

  /** Canales de desexcitación del estado actual (vacío en 1s y en 2s) */
  channels() {
    const { z, mass } = this.context();
    const c = this.current();
    return decayChannels(c.n, c.l, mass, z);
  }

  currentLifetime(): number {
    const { z, mass } = this.context();
    const c = this.current();
    return lifetime(c.n, c.l, mass, z);
  }

  emit(): void {
    const ctx = this.context();
    if (this.busy || !ctx.oneElectron) return;
    const c = this.current();
    const channels = this.channels();
    if (!channels.length) return;
    // Sorteo ponderado por las probabilidades de transición
    let u = Math.random();
    let pick = channels[channels.length - 1];
    for (const ch of channels) {
      if (u < ch.branching) {
        pick = ch;
        break;
      }
      u -= ch.branching;
    }
    const ev: PhotonEvent = {
      kind: 'emit',
      nLower: pick.n,
      nUpper: c.n,
      vacuumNm: vacuumWavelengthNm(pick.n, c.n, ctx.z, ctx.mass),
      tableNm: tableWavelengthNm(pick.n, c.n, ctx.z, ctx.mass),
      lifetimeS: this.currentLifetime(),
    };
    this.busy = true;
    const next = pick.n === 1 && pick.l === 0 ? null : { n: pick.n, l: pick.l, m: 0 };
    store.set({ excited: next, lastPhoton: ev });
    const epoch = this.epoch;
    this.fx.launch({
      direction: 'emit',
      nm: ev.vacuumNm,
      color: this.color(ev.tableNm),
      label: this.label(ev),
      radius: this.radius(),
      onDone: () => {
        if (epoch !== this.epoch) return;
        this.busy = false;
        this.onChange();
        this.scheduleAuto();
      },
    });
  }

  /** 2s → 1s: prohibido con un fotón; ocurre con dos (espectro continuo) */
  twoPhoton(): void {
    const ctx = this.context();
    const c = this.current();
    if (this.busy || c.n !== 2 || c.l !== 0) return;
    const total = vacuumWavelengthNm(1, 2, ctx.z, ctx.mass);
    const ev: PhotonEvent = { kind: 'two-photon', nLower: 1, nUpper: 2, vacuumNm: total, tableNm: total, lifetimeS: null };
    this.busy = true;
    store.set({ excited: null, lastPhoton: ev });
    let left = 2;
    const epoch = this.epoch;
    for (let i = 0; i < 2; i++)
      this.fx.launch({
        direction: 'emit',
        nm: 2 * total,
        color: new THREE.Color('#b9a6ff'),
        label: i === 0 ? 'dos fotones · espectro continuo' : '',
        radius: this.radius(),
        onDone: () => {
          if (epoch !== this.epoch) return;
          if (--left === 0) {
            this.busy = false;
            this.onChange();
          }
        },
      });
  }

  setAuto(on: boolean): void {
    this.auto = on;
    this.scheduleAuto();
    this.onChange();
  }

  reset(): void {
    window.clearTimeout(this.autoTimer);
    this.busy = false;
    this.epoch++;
  }

  private scheduleAuto(): void {
    window.clearTimeout(this.autoTimer);
    if (!this.auto) return;
    this.autoTimer = window.setTimeout(() => {
      if (this.channels().length) this.emit();
    }, 1400);
  }

  private color(nm: number): THREE.Color {
    const c = wavelengthToRgb(nm);
    return new THREE.Color(c.r, c.g, c.b);
  }

  label(ev: PhotonEvent): string {
    const region = wavelengthToRgb(ev.tableNm).region;
    const tag = region === 'visible' ? '' : ` · ${region}`;
    // Las series con nombre (Lyman, Balmer…) son las del hidrógeno
    const name = store.get().z === 1 ? lineName(ev.nLower, ev.nUpper) : `n ${ev.nUpper} → ${ev.nLower}`;
    return `${num(ev.tableNm, 1)} nm${tag} · ${name}`;
  }
}
