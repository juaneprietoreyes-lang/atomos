import * as THREE from 'three';
import { packNucleus } from '../physics/nucleus';
import { NEUTRON_COLOR, PROTON_COLOR } from './colors';

/**
 * Núcleo: protones y neutrones como esferas empaquetadas. Dos InstancedMesh
 * (una llamada de dibujo por tipo), no una malla por nucleón.
 */
export class NucleusView {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.IcosahedronGeometry(1, 2);
  private readonly protonMat = new THREE.MeshStandardMaterial({
    color: PROTON_COLOR,
    roughness: 0.45,
    metalness: 0.05,
    emissive: PROTON_COLOR.clone().multiplyScalar(0.18),
  });
  private readonly neutronMat = new THREE.MeshStandardMaterial({
    color: NEUTRON_COLOR,
    roughness: 0.5,
    metalness: 0.05,
    emissive: NEUTRON_COLOR.clone().multiplyScalar(0.12),
  });
  private meshes: THREE.InstancedMesh[] = [];
  private packedRadius = 1;
  private key = '';
  /** Radio en a₀, actual y objetivo */
  radius = 0;
  targetRadius = 0;
  /** Vibración del núcleo (0 = estable, 1 = se deshace al instante) */
  jitter = 0;

  constructor() {
    this.group.renderOrder = 0;
  }

  setNucleons(protons: number, neutrons: number): void {
    const key = `${protons}-${neutrons}`;
    if (key === this.key) return;
    this.key = key;
    for (const m of this.meshes) {
      this.group.remove(m);
      m.dispose();
    }
    this.meshes = [];
    if (protons + neutrons === 0) return;
    const packed = packNucleus(protons, neutrons);
    this.packedRadius = packed.radius;
    const m4 = new THREE.Matrix4();
    for (const [wantProton, mat] of [
      [true, this.protonMat],
      [false, this.neutronMat],
    ] as const) {
      const idx = packed.isProton.flatMap((p, i) => (p === wantProton ? [i] : []));
      if (!idx.length) continue;
      const mesh = new THREE.InstancedMesh(this.geometry, mat, idx.length);
      idx.forEach((i, k) => {
        m4.makeTranslation(packed.positions[i * 3], packed.positions[i * 3 + 1], packed.positions[i * 3 + 2]);
        mesh.setMatrixAt(k, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  step(dt: number): void {
    const k = 1 - Math.exp(-dt * 5);
    // Interpolación logarítmica: entre escala real y didáctica hay 4 órdenes de magnitud
    const lr = Math.log(Math.max(this.radius, 1e-9));
    const lt = Math.log(Math.max(this.targetRadius, 1e-9));
    this.radius = Math.abs(lt - lr) < 1e-4 ? this.targetRadius : Math.exp(lr + (lt - lr) * k);
    this.group.scale.setScalar(this.radius / this.packedRadius);
    this.group.rotation.z += dt * 0.15;
    // Un núcleo inestable no se está quieto: tiembla más cuanto menos dura
    const j = this.jitter * this.radius * 0.35;
    if (j > 0) this.group.position.set((Math.random() - 0.5) * j, (Math.random() - 0.5) * j, (Math.random() - 0.5) * j);
    else this.group.position.set(0, 0, 0);
  }
}
