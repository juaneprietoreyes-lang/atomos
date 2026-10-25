/**
 * Hace temblar un elemento con una intensidad de 0 a 1 (núcleos inestables).
 * Con «reducir movimiento» activado en el sistema, en lugar de temblar parpadea un borde.
 */
export function shake(el: HTMLElement, intensity: number): void {
  if (intensity <= 0) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    el.animate(
      [{ boxShadow: 'inset 0 0 0 0 transparent' }, { boxShadow: `inset 0 0 0 4px rgba(255,120,90,${0.3 + intensity * 0.6})` }, { boxShadow: 'inset 0 0 0 0 transparent' }],
      { duration: 900, easing: 'ease-out' },
    );
    return;
  }
  const amp = 2 + 16 * intensity;
  const steps = 14;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const decay = 1 - i / steps;
    const x = (Math.random() * 2 - 1) * amp * decay;
    const y = (Math.random() * 2 - 1) * amp * decay;
    const r = (Math.random() * 2 - 1) * intensity * 1.2 * decay;
    frames.push({ transform: i === steps ? 'none' : `translate(${x}px, ${y}px) rotate(${r}deg)` });
  }
  el.animate(frames, { duration: 450 + 600 * intensity, easing: 'linear' });
}
