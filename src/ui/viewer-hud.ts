/** Capas de interfaz superpuestas al visor 3D */
export interface Hud {
  title: HTMLElement;
  badge: HTMLElement;
  controls: HTMLElement;
  legend: HTMLElement;
  scaleInfo: HTMLElement;
  actions: HTMLElement;
  bottom: HTMLElement;
  fps: HTMLElement;
}

export function createHud(viewer: HTMLElement): Hud {
  viewer.insertAdjacentHTML(
    'beforeend',
    `<div class="hud hud-top-left">
       <div class="hud-title" id="hud-title"></div>
       <div class="hud-badge" id="hud-badge"></div>
     </div>
     <div class="hud hud-top-right" id="hud-controls"></div>
     <div class="hud hud-left panel" id="hud-legend"></div>
     <div class="hud hud-scale panel" id="hud-scale" hidden></div>
     <div class="hud hud-right" id="hud-actions"></div>
     <div class="hud hud-bottom" id="hud-bottom"></div>
     <div class="hud hud-fps" id="hud-fps" hidden></div>`,
  );
  const $ = (id: string) => viewer.querySelector<HTMLElement>(`#${id}`)!;
  return {
    title: $('hud-title'),
    badge: $('hud-badge'),
    controls: $('hud-controls'),
    legend: $('hud-legend'),
    scaleInfo: $('hud-scale'),
    actions: $('hud-actions'),
    bottom: $('hud-bottom'),
    fps: $('hud-fps'),
  };
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

/** Control segmentado accesible (grupo de botones con aria-pressed) */
export function segmented<T extends string>(
  label: string,
  options: SegmentOption<T>[],
  value: T,
  onChange: (v: T) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'seg';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', label);
  wrap.innerHTML = `<span class="seg-label">${label}</span>`;
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = o.label;
    if (o.title) b.title = o.title;
    b.setAttribute('aria-pressed', String(o.value === value));
    b.addEventListener('click', () => onChange(o.value));
    wrap.append(b);
  }
  return wrap;
}
