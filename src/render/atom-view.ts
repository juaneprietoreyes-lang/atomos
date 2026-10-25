import * as THREE from 'three';
import { displayedMeanRadius, type OrbitalSpec } from '../physics/orbitals';
import { Axes } from './axes';
import { PHASE_NEGATIVE, PHASE_POSITIVE, subshellColor } from './colors';
import { NucleusView } from './nucleus-view';
import { OrbitalCloud } from './orbital-cloud';
import { cachedSample, getSample, MAX_POINTS, sampleKey } from './sample-cache';
import type { Stage } from './scene';

/** Puntos totales en pantalla: suficiente para que se vea la densidad y los pesados vayan a 60 fps */
export const TOTAL_POINTS = 220000;

export interface AtomScene {
  orbitals: OrbitalSpec[];
  /** Etiquetas de orbitales ocultos («2p_x») */
  hidden: ReadonlySet<string>;
  phase: boolean;
  /** Radio del núcleo en a₀ (real o didáctico, lo decide quien llama) */
  nucleusRadius: number;
  protons: number;
  neutrons: number;
  /** Opacidad global de las nubes (0 en modo Bohr) */
  cloudsOpacity: number;
  /** Clave del átomo: si cambia, se reencuadra la cámara */
  frameKey: string;
}

/** Radio que encuadra todas las nubes (las colas llegan a ~2⟨r⟩) */
export const frameRadius = (orbitals: OrbitalSpec[]): number =>
  Math.max(0.5, ...orbitals.map((o) => displayedMeanRadius(o) * 2.0));

/**
 * Reparto del presupuesto: puntos ∝ electrones del orbital, con el mismo peso por
 * electrón entre los orbitales visibles (así la densidad relativa es la real y, al
 * aislar un orbital, se dibuja con muchos más puntos).
 */
export function pointBudget(orbitals: OrbitalSpec[]): Map<OrbitalSpec, number> {
  const totalOcc = orbitals.reduce((s, o) => s + o.occupancy, 0);
  const maxOcc = Math.max(1, ...orbitals.map((o) => o.occupancy));
  const perElectron = Math.min(MAX_POINTS / maxOcc, TOTAL_POINTS / Math.max(totalOcc, 1e-9));
  return new Map(orbitals.map((o) => [o, Math.round(o.occupancy * perElectron)]));
}

export class AtomView {
  readonly nucleus = new NucleusView();
  readonly axes = new Axes();
  private readonly clouds = new Map<string, OrbitalCloud>();
  private readonly cloudGroup = new THREE.Group();
  private cloudsOpacity = 1;
  private targetCloudsOpacity = 1;
  private lastFrameKey = '';
  private generation = 0;
  /** Distancia de cámara del encuadre actual (referencia para el tamaño de los puntos) */
  private frameDistance = 1;
  /** Puntos visibles y radio que ocupan (a₀), para la exposición automática */
  private visiblePoints = 1;
  private visibleRadius = 1;
  private exposure = 0.4;

  constructor(private readonly stage: Stage) {
    stage.world.add(this.nucleus.group, this.cloudGroup, this.axes.group);
    stage.onFrame((dt) => this.step(dt));
  }

  update(s: AtomScene): void {
    const gen = ++this.generation;
    const visible = s.orbitals.filter((o) => !s.hidden.has(o.label));
    const budget = pointBudget(visible);
    this.visiblePoints = [...budget.values()].reduce((a, b) => a + b, 0);
    this.visibleRadius = frameRadius(visible.length ? visible : s.orbitals);
    const active = new Set<string>();

    for (const o of s.orbitals) {
      const key = sampleKey(o.n, o.l, o.m);
      active.add(key);
      let cloud = this.clouds.get(key);
      if (!cloud) {
        cloud = new OrbitalCloud(
          subshellColor(o.n, o.l),
          PHASE_POSITIVE,
          PHASE_NEGATIVE,
          this.stage.renderer.getPixelRatio(),
        );
        // Nace ya a su escala: entra con un fundido, no creciendo desde cero
        cloud.scale = o.scale;
        this.clouds.set(key, cloud);
        this.cloudGroup.add(cloud.points);
      }
      cloud.targetScale = o.scale;
      cloud.targetOpacity = s.hidden.has(o.label) ? 0 : 1;
      // Los ocultos conservan sus puntos mientras se desvanecen
      if (budget.has(o)) cloud.setCount(budget.get(o)!);
      cloud.setPhase(s.phase);
      const sample = cachedSample(o.n, o.l, o.m);
      if (sample && !cloud.hasSample) cloud.setSample(sample);
      else if (!sample) {
        cloud.targetOpacity = 0;
        const target = cloud;
        const visible = !s.hidden.has(o.label);
        void getSample(o.n, o.l, o.m).then((smp) => {
          if (!target.hasSample) target.setSample(smp);
          // Si mientras tanto se pidió otro átomo, esta nube ya no toca
          if (gen === this.generation && visible) target.targetOpacity = 1;
        });
      }
    }
    // Los orbitales que ya no están se desvanecen (se reutilizan si vuelven)
    for (const [key, cloud] of this.clouds) if (!active.has(key)) cloud.targetOpacity = 0;

    this.targetCloudsOpacity = s.cloudsOpacity;
    this.axes.group.visible = s.cloudsOpacity > 0;
    this.nucleus.setNucleons(s.protons, s.neutrons);
    this.nucleus.targetRadius = s.nucleusRadius;
    if (this.nucleus.radius === 0) this.nucleus.radius = s.nucleusRadius;

    const fr = frameRadius(s.orbitals);
    this.axes.setLength(fr * 1.05);
    if (s.frameKey !== this.lastFrameKey) {
      this.stage.frame(fr, this.lastFrameKey === '');
      this.lastFrameKey = s.frameKey;
      this.frameDistance = this.stage.fitDistance(fr);
    }
  }

  private step(dt: number): void {
    const k = 1 - Math.exp(-dt * 6);
    this.cloudsOpacity += (this.targetCloudsOpacity - this.cloudsOpacity) * k;
    const { camera, controls, renderer } = this.stage;
    const dist = Math.max(1e-9, camera.position.distanceTo(controls.target));
    // Al acercarse, los puntos crecen un poco para que la nube no se vea rala
    const zoom = this.frameDistance / dist;
    const sizeCss = 2.6 * Math.min(2.4, Math.max(0.75, Math.sqrt(zoom)));
    // Exposición automática: misma «cantidad de luz» con 5 000 o con 200 000 puntos y a
    // cualquier zoom. Es una sola opacidad para todo el átomo, así que dentro de cada nube
    // y entre orbitales el brillo sigue siendo proporcional a la densidad de probabilidad.
    const radiusPx = (this.visibleRadius / (dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * (this.stage.height() / 2);
    const coverage = (this.visiblePoints * sizeCss * sizeCss) / (4 * Math.max(1, radiusPx * radiusPx));
    const target = Math.min(0.85, Math.max(0.025, 1.1 / Math.max(coverage, 1e-6)));
    this.exposure += (target - this.exposure) * k;
    for (const cloud of this.clouds.values()) {
      cloud.setPointSize(sizeCss * renderer.getPixelRatio());
      cloud.step(dt, this.cloudsOpacity * this.exposure);
    }
    this.nucleus.step(dt);
  }
}
