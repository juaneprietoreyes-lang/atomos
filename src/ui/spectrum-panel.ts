import { SPECTRA } from '../data/loader';
import type { SpectralLine } from '../data/types';
import { lineName, nuclearMassFromAtomic, tableWavelengthNm } from '../physics/hydrogen';
import { rgbCss, VISIBLE_MAX_NM, VISIBLE_MIN_NM, wavelengthToRgb } from '../physics/wavelength-color';
import type { AtomModel } from '../atom-model';
import type { PhotonEvent } from '../state';
import { escapeHtml, num } from './format';

/**
 * Espectro de emisión en el visible.
 * - Hidrógeno: posiciones calculadas con Rydberg; el brillo, si NIST ha medido la
 *   línea, es su intensidad relativa.
 * - Resto: solo líneas medidas de NIST para el átomo neutro. Si no hay, nada.
 */
interface DrawnLine {
  nm: number;
  /** 0–1 */
  brightness: number;
  label: string;
}

const MAX_BALMER_N = 40;

function hydrogenLines(atom: AtomModel): { visible: DrawnLine[]; outside: string[] } {
  const mass = atom.isotope ? nuclearMassFromAtomic(atom.isotope.mass, 1) : undefined;
  const nist = SPECTRA.H ?? [];
  const imax = Math.max(...nist.map((l) => l.intensity), 1);
  const visible: DrawnLine[] = [];
  for (let n = 3; n <= MAX_BALMER_N; n++) {
    const nm = tableWavelengthNm(2, n, 1, mass);
    if (nm < VISIBLE_MIN_NM) break;
    const measured = nist.find((l) => Math.abs(l.nm - nm) < 0.05);
    visible.push({
      nm,
      brightness: measured ? 0.3 + 0.7 * (Math.log1p(measured.intensity) / Math.log1p(imax)) : 0.25,
      label: `${lineName(2, n)} · calculada${measured ? ` · NIST: intensidad ${measured.intensity}` : ''}`,
    });
  }
  const series = (nLow: number, count: number) =>
    Array.from({ length: count }, (_, i) => num(tableWavelengthNm(nLow, nLow + 1 + i, 1, mass), 1)).join(' · ');
  const outside = [
    `<strong>Lyman</strong> (UV): ${series(1, 4)} … nm`,
    `<strong>Paschen</strong> (IR): ${series(3, 3)} … nm`,
    `<strong>Brackett</strong> (IR): ${series(4, 2)} … nm`,
  ];
  return { visible, outside };
}

function nistLines(lines: SpectralLine[]): DrawnLine[] {
  const imax = Math.max(...lines.map((l) => l.intensity));
  return lines.map((l) => ({
    nm: l.nm,
    brightness: 0.22 + 0.78 * (Math.log1p(l.intensity) / Math.log1p(imax)),
    label: `intensidad relativa NIST ${l.intensity}`,
  }));
}

export class SpectrumPanel {
  private open = true;
  private canvas!: HTMLCanvasElement;
  private lines: DrawnLine[] = [];
  private highlight: number | null = null;

  constructor(private readonly container: HTMLElement) {
    new ResizeObserver(() => this.draw()).observe(container);
  }

  render(atom: AtomModel, charge: number, last: PhotonEvent | null): void {
    const el = atom.element;
    let body = '';
    let note = '';
    this.lines = [];
    this.highlight = last && last.kind !== 'two-photon' ? last.tableNm : null;

    if (el.z === 1 && atom.electrons === 1) {
      const { visible, outside } = hydrogenLines(atom);
      this.lines = visible;
      note = `Serie de Balmer calculada con la fórmula de Rydberg (masa reducida, λ en aire). Fuera del visible: ${outside.join(' · ')}.`;
    } else if (charge !== 0) {
      note = `Las líneas de NIST son del átomo neutro; el espectro de un ion (${escapeHtml(el.symbol)} con carga ${charge > 0 ? '+' : ''}${charge}) es distinto, así que no se muestra.`;
    } else if (SPECTRA[el.symbol]?.length) {
      this.lines = nistLines(SPECTRA[el.symbol]);
      note = `${this.lines.length} líneas más intensas del ${escapeHtml(el.name.toLowerCase())} neutro medidas por NIST (λ en aire). El brillo sigue la intensidad relativa (escala logarítmica).`;
    } else {
      note = `NIST no tiene líneas con intensidad medida para el ${escapeHtml(el.name.toLowerCase())} neutro: no se muestra nada en lugar de inventarlo.`;
    }

    body = this.lines.length
      ? `<div class="spec-wrap"><canvas class="spec-canvas" aria-label="Espectro de emisión"></canvas>
          <div class="spec-axis">${[400, 450, 500, 550, 600, 650, 700]
            .map((nm) => `<span style="left:${((nm - VISIBLE_MIN_NM) / (VISIBLE_MAX_NM - VISIBLE_MIN_NM)) * 100}%">${nm}</span>`)
            .join('')}<span class="spec-unit">nm</span></div>
          <div class="spec-tip" hidden></div></div>`
      : '';

    const lastChip =
      last && last.kind !== 'two-photon' && wavelengthToRgb(last.tableNm).region !== 'visible'
        ? `<span class="tag warn">último fotón: ${num(last.tableNm, 1)} nm (${wavelengthToRgb(last.tableNm).region}), fuera de esta franja</span>`
        : '';

    this.container.innerHTML = `
      <div class="panel spectrum ${this.open ? '' : 'is-closed'}">
        <button type="button" class="spec-head" aria-expanded="${this.open}">
          <span>Espectro de emisión</span><span class="muted">${this.open ? '▾' : '▸'}</span>
        </button>
        <div class="spec-body">${body}<p class="spec-note">${note} ${lastChip}</p></div>
      </div>`;
    this.container.querySelector('.spec-head')!.addEventListener('click', () => {
      this.open = !this.open;
      this.render(atom, charge, last);
    });
    const canvas = this.container.querySelector<HTMLCanvasElement>('.spec-canvas');
    if (canvas) {
      this.canvas = canvas;
      this.bindHover(canvas);
      this.draw();
    }
  }

  private draw(): void {
    const c = this.canvas;
    if (!c || !c.isConnected) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    g.fillStyle = '#05070c';
    g.fillRect(0, 0, w, h);
    // Franja del visible muy tenue como referencia
    for (let x = 0; x < w; x++) {
      const nm = VISIBLE_MIN_NM + (x / w) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM);
      g.fillStyle = rgbCss(wavelengthToRgb(nm));
      g.globalAlpha = 0.07;
      g.fillRect(x, h - 4, 1, 4);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
    for (const line of this.lines) {
      const x = ((line.nm - VISIBLE_MIN_NM) / (VISIBLE_MAX_NM - VISIBLE_MIN_NM)) * w;
      const col = rgbCss(wavelengthToRgb(line.nm));
      g.globalAlpha = line.brightness;
      g.fillStyle = col;
      g.fillRect(x - 1, 0, 2, h - 6);
      g.globalAlpha = line.brightness * 0.35;
      g.fillRect(x - 3, 0, 6, h - 6);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    if (this.highlight !== null && this.highlight >= VISIBLE_MIN_NM && this.highlight <= VISIBLE_MAX_NM) {
      const x = ((this.highlight - VISIBLE_MIN_NM) / (VISIBLE_MAX_NM - VISIBLE_MIN_NM)) * w;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.strokeRect(x - 5, 1, 10, h - 8);
    }
  }

  private bindHover(c: HTMLCanvasElement): void {
    const tip = this.container.querySelector<HTMLElement>('.spec-tip')!;
    c.addEventListener('mousemove', (e) => {
      const r = c.getBoundingClientRect();
      const nm = VISIBLE_MIN_NM + ((e.clientX - r.left) / r.width) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM);
      let best: DrawnLine | null = null;
      for (const l of this.lines) if (!best || Math.abs(l.nm - nm) < Math.abs(best.nm - nm)) best = l;
      const px = best ? (Math.abs(best.nm - nm) / (VISIBLE_MAX_NM - VISIBLE_MIN_NM)) * r.width : Infinity;
      if (best && px < 6) {
        tip.hidden = false;
        tip.textContent = `${num(best.nm, 2)} nm · ${best.label}`;
        tip.style.left = `${e.clientX - r.left}px`;
      } else tip.hidden = true;
    });
    c.addEventListener('mouseleave', () => (tip.hidden = true));
  }
}
