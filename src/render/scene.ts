import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Escena base: renderer, cámara orbital y bucle de animación.
 * Convención: la física usa z hacia arriba; `world` gira −90° en x para que
 * el eje z físico quede vertical en pantalla. Todo lo del átomo cuelga de `world`.
 */
export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  world: THREE.Group;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  /** Callback por fotograma; dt en segundos */
  onFrame(cb: (dt: number, t: number) => void): void;
  /** Encuadra suavemente una esfera de radio r (unidades de escena = a₀) */
  frame(radius: number, instant?: boolean): void;
  /** Distancia de cámara que encuadra una esfera de radio r */
  fitDistance(radius: number): number;
  /** Altura del lienzo en píxeles CSS */
  height(): number;
  fps(): number;
}

export function createStage(container: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'stage-canvas';
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  world.rotation.x = -Math.PI / 2;
  scene.add(world);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.8);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(40, 1, 1e-6, 1e5);
  camera.position.set(6, 3.5, 9);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1e-4; // se puede bajar hasta ver el núcleo a escala real
  controls.maxDistance = 2000;
  controls.zoomSpeed = 1.2;

  const callbacks: ((dt: number, t: number) => void)[] = [];
  let frameAnim: { from: number; to: number; t: number } | null = null;

  // El tamaño lo marca el CSS del lienzo (en móvil no ocupa todo el visor)
  const canvas = renderer.domElement;
  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /** Distancia a la que una esfera de radio r cabe en el encuadre */
  function fitDistance(radius: number): number {
    const vFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hFov = Math.atan(Math.tan(vFov) * camera.aspect);
    return (radius / Math.sin(Math.min(vFov, hFov))) * 1.05;
  }

  let last = performance.now();
  let fpsValue = 60;
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    fpsValue += (1 / Math.max(dt, 1e-3) - fpsValue) * 0.05;
    if (frameAnim) {
      frameAnim.t = Math.min(1, frameAnim.t + dt / 0.9);
      const e = 1 - Math.pow(1 - frameAnim.t, 3);
      const d = frameAnim.from + (frameAnim.to - frameAnim.from) * e;
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, d);
      if (frameAnim.t >= 1) frameAnim = null;
    }
    for (const cb of callbacks) cb(dt, now / 1000);
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    renderer,
    scene,
    world,
    camera,
    controls,
    onFrame: (cb) => callbacks.push(cb),
    frame(radius, instant = false) {
      const to = fitDistance(radius);
      // Vuelve al centro si el usuario había desplazado la vista
      controls.target.set(0, 0, 0);
      if (instant) {
        const dir = camera.position.clone().normalize();
        camera.position.copy(dir.multiplyScalar(to));
        frameAnim = null;
      } else {
        frameAnim = { from: camera.position.distanceTo(controls.target), to, t: 0 };
      }
    },
    fitDistance,
    height: () => canvas.clientHeight,
    fps: () => fpsValue,
  };
}
