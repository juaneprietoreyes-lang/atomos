import * as THREE from 'three';

/** Ejes x, y, z tenues con su letra, para reconocer p_x, d_xy… */
export class Axes {
  readonly group = new THREE.Group();
  private readonly labels: THREE.Sprite[] = [];

  constructor() {
    const mat = new THREE.LineBasicMaterial({ color: 0x41507a, transparent: true, opacity: 0.55 });
    const dirs: [string, THREE.Vector3][] = [
      ['x', new THREE.Vector3(1, 0, 0)],
      ['y', new THREE.Vector3(0, 1, 0)],
      ['z', new THREE.Vector3(0, 0, 1)],
    ];
    for (const [name, d] of dirs) {
      const geo = new THREE.BufferGeometry().setFromPoints([d.clone().multiplyScalar(-1), d]);
      this.group.add(new THREE.Line(geo, mat));
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(name), transparent: true, depthTest: false }));
      sprite.position.copy(d.clone().multiplyScalar(1.08));
      sprite.userData.dir = d;
      this.labels.push(sprite);
      this.group.add(sprite);
    }
  }

  /** Longitud de los semiejes, en a₀ */
  setLength(len: number): void {
    this.group.scale.setScalar(len);
    for (const s of this.labels) s.scale.setScalar(0.07);
  }
}

function labelTexture(text: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.font = '600 40px system-ui, sans-serif';
  g.fillStyle = '#8fa2cc';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 32, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
