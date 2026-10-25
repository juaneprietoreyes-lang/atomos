import * as THREE from 'three';
import type { Subshell } from '../physics/configuration';
import type { Stage } from './scene';

/**
 * Modelo de Bohr (1913), solo como esquema histórico: electrones en órbitas
 * circulares por capas K, L, M… Las órbitas siempre miran a la cámara.
 * - Átomo de un electrón: radios de Bohr reales r = n²·a₀/Z (el modelo acierta
 *   las energías del hidrógeno, aunque no la forma del átomo).
 * - Varios electrones: anillos equiespaciados, sin escala (como en los libros).
 */
const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];

export class BohrView {
  readonly group = new THREE.Group();
  private readonly rings = new THREE.Group();
  private readonly electronGeo = new THREE.SphereGeometry(1, 16, 12);
  private readonly electronMat = new THREE.MeshBasicMaterial({ color: '#8fd3ff' });
  private electrons: { mesh: THREE.Mesh; radius: number; phase: number; speed: number }[] = [];
  private labels: HTMLElement[] = [];
  private opacity = 0;
  targetOpacity = 0;

  constructor(
    private readonly stage: Stage,
    private readonly overlay: HTMLElement,
  ) {
    this.group.add(this.rings);
    this.group.visible = false;
    stage.scene.add(this.group);
    stage.onFrame((dt, t) => this.step(dt, t));
  }

  /** Reconstruye las órbitas. frameRadius: radio del encuadre en a₀ */
  set(shells: Subshell[], z: number, frameRadius: number): void {
    this.rings.clear();
    for (const e of this.electrons) e.mesh.removeFromParent();
    this.electrons = [];
    for (const l of this.labels) l.remove();
    this.labels = [];

    const perShell = new Map<number, number>();
    for (const s of shells) perShell.set(s.n, (perShell.get(s.n) ?? 0) + s.electrons);
    const total = shells.reduce((a, s) => a + s.electrons, 0);
    if (!total) return;
    const maxN = Math.max(...perShell.keys());
    const single = total === 1;
    const radiusOf = (n: number) => (single ? (n * n) / z : (frameRadius * 0.9 * n) / maxN);
    const eSize = (single ? radiusOf(maxN) : frameRadius) * 0.025;

    // Con un electrón se dibujan también las órbitas vacías por debajo (niveles de energía)
    const shellList: [number, number][] = single
      ? Array.from({ length: maxN }, (_, i) => [i + 1, perShell.get(i + 1) ?? 0])
      : [...perShell.entries()].sort((a, b) => a[0] - b[0]);
    for (const [n, count] of shellList) {
      const r = radiusOf(n);
      const pts = Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0);
      });
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: '#4a6aa8', transparent: true, opacity: 0.7 }),
      );
      this.rings.add(ring);
      for (let k = 0; k < count; k++) {
        const mesh = new THREE.Mesh(this.electronGeo, this.electronMat);
        mesh.scale.setScalar(eSize);
        this.rings.add(mesh);
        // En Bohr la velocidad angular va como 1/n³; aquí, suavizada para que se vea
        this.electrons.push({ mesh, radius: r, phase: (k / count) * Math.PI * 2 + n, speed: 1.6 / Math.pow(n, 1.2) });
      }
      const label = document.createElement('div');
      label.className = 'bohr-label';
      label.textContent = single ? `n = ${n}` : `${SHELL_NAMES[n - 1] ?? n} · ${count}`;
      label.dataset.r = String(r);
      this.overlay.append(label);
      this.labels.push(label);
    }
  }

  private step(dt: number, t: number): void {
    this.opacity += (this.targetOpacity - this.opacity) * (1 - Math.exp(-dt * 6));
    this.group.visible = this.opacity > 0.01;
    for (const l of this.labels) l.style.opacity = String(this.opacity);
    if (!this.group.visible) return;
    // Las órbitas de cara a la cámara
    this.group.quaternion.copy(this.stage.camera.quaternion);
    this.rings.traverse((o) => {
      if (o instanceof THREE.Line) (o.material as THREE.LineBasicMaterial).opacity = 0.7 * this.opacity;
    });
    this.electronMat.opacity = this.opacity;
    this.electronMat.transparent = this.opacity < 0.99;
    for (const e of this.electrons) {
      const a = e.phase + t * e.speed;
      e.mesh.position.set(Math.cos(a) * e.radius, Math.sin(a) * e.radius, 0);
    }
    // Etiquetas K, L, M… arriba de cada órbita
    const w = this.overlay.clientWidth;
    const h = this.overlay.clientHeight;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.stage.camera.quaternion);
    for (const l of this.labels) {
      const p = up.clone().multiplyScalar(Number(l.dataset.r)).project(this.stage.camera);
      l.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
    }
  }
}
