import * as THREE from 'three';
import type { OrbitalSample } from '../physics/sampling';

/**
 * Nube de un orbital: THREE.Points con BufferGeometry y un shader propio.
 * Cada punto es una muestra de |ψ|² con el mismo peso; con mezcla aditiva el
 * brillo de una zona es proporcional a cuántos puntos caen en ella, es decir,
 * a la densidad de probabilidad.
 */
const vertexShader = /* glsl */ `
  attribute float aSign;
  uniform float uScale;
  uniform float uSize;
  uniform float uPhase;
  uniform vec3 uColor;
  uniform vec3 uColorPos;
  uniform vec3 uColorNeg;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position * uScale, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize;
    vColor = uPhase > 0.5 ? (aSign < 0.0 ? uColorNeg : uColorPos) : uColor;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c) * 4.0;
    if (d > 1.0) discard;
    float a = (1.0 - d);
    gl_FragColor = vec4(vColor, a * a * uOpacity);
  }
`;

export class OrbitalCloud {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.BufferGeometry();
  private capacity = 0;
  /** Escala y opacidad actuales y objetivo (para transiciones suaves) */
  scale = 1;
  targetScale = 1;
  opacity = 0;
  targetOpacity = 1;
  count = 0;

  constructor(color: THREE.Color, positive: THREE.Color, negative: THREE.Color, pixelRatio: number) {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uScale: { value: 1 },
        uSize: { value: 2.6 * pixelRatio },
        uPhase: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: color.clone() },
        uColorPos: { value: positive.clone() },
        uColorNeg: { value: negative.clone() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  setSample(sample: OrbitalSample): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(sample.positions, 3));
    this.geometry.setAttribute('aSign', new THREE.BufferAttribute(Float32Array.from(sample.signs), 1));
    this.capacity = sample.signs.length;
    this.setCount(this.count);
  }

  get hasSample(): boolean {
    return this.capacity > 0;
  }

  /** Cuántos puntos dibujar (prefijo de la muestra) */
  setCount(count: number): void {
    this.count = count;
    this.geometry.setDrawRange(0, Math.min(count, this.capacity));
  }

  setPhase(on: boolean): void {
    this.material.uniforms.uPhase.value = on ? 1 : 0;
  }

  setPointSize(px: number): void {
    this.material.uniforms.uSize.value = px;
  }

  /** Avanza la transición; devuelve true cuando ya no hay nada que animar */
  step(dt: number, globalOpacity: number): boolean {
    const k = 1 - Math.exp(-dt * 7);
    this.scale += (this.targetScale - this.scale) * k;
    this.opacity += (this.targetOpacity - this.opacity) * k;
    if (Math.abs(this.targetScale - this.scale) < 1e-6 * this.targetScale) this.scale = this.targetScale;
    if (Math.abs(this.targetOpacity - this.opacity) < 1e-3) this.opacity = this.targetOpacity;
    this.material.uniforms.uScale.value = this.scale;
    this.material.uniforms.uOpacity.value = this.opacity * globalOpacity;
    this.points.visible = this.opacity * globalOpacity > 0.002 && this.count > 0;
    return this.scale === this.targetScale && this.opacity === this.targetOpacity;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
