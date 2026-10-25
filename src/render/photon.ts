import * as THREE from 'three';
import type { Stage } from './scene';

/**
 * Fotón animado: un paquete de ondas brillante que sale del átomo (emisión) o
 * llega hasta él (absorción). La longitud de la ondulación crece con λ en escala
 * logarítmica (no a escala real: 656 nm sería 12 000 veces el átomo).
 */
export interface PhotonOptions {
  direction: 'emit' | 'absorb';
  nm: number;
  color: THREE.Color;
  /** Texto de la etiqueta que acompaña al fotón */
  label: string;
  /** Radio del átomo en pantalla (a₀), para dimensionar el recorrido */
  radius: number;
  onDone?: () => void;
}

const SAMPLES = 420;
const DURATION = 1.8;

const vertexShader = /* glsl */ `
  attribute float aAlpha;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
  }
`;
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c) * 4.0;
    if (d > 1.0) discard;
    gl_FragColor = vec4(uColor, (1.0 - d) * vAlpha * uOpacity);
  }
`;

interface Live {
  opts: PhotonOptions;
  t: number;
  points: THREE.Points;
  dir: THREE.Vector3;
  side: THREE.Vector3;
  label: HTMLElement;
}

export class PhotonFx {
  private readonly live: Live[] = [];

  constructor(
    private readonly stage: Stage,
    private readonly overlay: HTMLElement,
  ) {
    stage.onFrame((dt) => this.step(dt));
  }

  launch(opts: PhotonOptions): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SAMPLES * 3), 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(SAMPLES), 1));
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: { value: opts.color },
        uOpacity: { value: 1 },
        uSize: { value: 3.2 * this.stage.renderer.getPixelRatio() },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 20;
    this.stage.scene.add(points);

    // Dirección al azar, pero más bien de lado respecto a la cámara para que se vea
    const cam = this.stage.camera;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const angle = Math.random() * Math.PI * 2;
    const dir = right.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle) * 0.7).normalize();
    const side = new THREE.Vector3().crossVectors(dir, cam.getWorldDirection(new THREE.Vector3())).normalize();

    const label = document.createElement('div');
    label.className = 'photon-label';
    label.textContent = opts.label;
    label.style.setProperty('--c', `#${opts.color.getHexString()}`);
    this.overlay.append(label);

    this.live.push({ opts, t: 0, points, dir, side, label });
  }

  private step(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.t += dt / DURATION;
      const { radius, direction, nm } = p.opts;
      // Centro del paquete: de 0 a 1,9 radios (emisión) o al revés (absorción)
      const travel = direction === 'emit' ? p.t : 1 - p.t;
      const center = radius * 1.9 * travel;
      const lambdaVis = radius * 0.05 * (1 + Math.log10(Math.max(nm, 50) / 50));
      const halfLen = Math.max(lambdaVis * 3.5, radius * 0.22);
      const amp = radius * 0.035;
      const phase = p.t * 40;
      const pos = p.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const alpha = p.points.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
      for (let k = 0; k < SAMPLES; k++) {
        const u = (k / (SAMPLES - 1)) * 2 - 1;
        const x = center + u * halfLen;
        const env = Math.exp(-u * u * 3);
        const y = amp * env * Math.sin((u * halfLen * 2 * Math.PI) / lambdaVis - phase);
        pos.setXYZ(k, p.dir.x * x + p.side.x * y, p.dir.y * x + p.side.y * y, p.dir.z * x + p.side.z * y);
        alpha.setX(k, env * (x < 0 ? 0 : 1));
      }
      pos.needsUpdate = true;
      alpha.needsUpdate = true;
      const fade = Math.min(1, (1 - p.t) * 4, p.t * 6);
      (p.points.material as THREE.ShaderMaterial).uniforms.uOpacity.value = fade;

      // Etiqueta en la cabeza del paquete
      const head = p.dir.clone().multiplyScalar(center + halfLen * 0.6).project(this.stage.camera);
      const w = this.overlay.clientWidth;
      const h = this.overlay.clientHeight;
      p.label.style.transform = `translate(${((head.x + 1) / 2) * w}px, ${((1 - head.y) / 2) * h}px)`;
      p.label.style.opacity = String(fade);

      if (p.t >= 1) {
        this.stage.scene.remove(p.points);
        p.points.geometry.dispose();
        (p.points.material as THREE.Material).dispose();
        p.label.remove();
        this.live.splice(i, 1);
        p.opts.onDone?.();
      }
    }
  }
}
