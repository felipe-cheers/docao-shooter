// Tampa do Tacho em low-poly (toon, igual às outras armas). Sem importar docao.js — ele importa este arquivo.
import * as THREE from 'three';

const gradTex = (() => {
  const t = new THREE.DataTexture(new Uint8Array([95, 160, 210]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: gradTex });
function outline(mesh) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x2b1206, side: THREE.BackSide }));
  o.scale.setScalar(1.05); o.raycast = () => {}; o.userData.isOutline = true; mesh.add(o); return mesh;
}
const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); outline(m); return m; };

// Disco de ferro com aro de latão, alça, fresta e estágios (limpo / amassado / rachado / estilhaçado).
export function makeShieldMesh({ radius = 0.36, thick = 0.06, oval = 1.35, name = 'tampa' } = {}) {
  const g = new THREE.Group(); g.name = name;
  const R = radius, iron = toon(0x8a9098), brass = toon(0xd7b15a), dark = toon(0x14161a), wood = toon(0x6b4423), skin = toon(0xee9c22);
  const face = new THREE.Group(); g.add(face);
  const disc = add(new THREE.CylinderGeometry(R, R * 0.97, thick, 16), iron, 0, 0, 0, face); disc.rotation.x = Math.PI / 2;
  const rim = add(new THREE.TorusGeometry(R * 0.98, thick * 0.42, 6, 18), brass, 0, 0, 0, face);
  // fresta: retângulo escuro no alto, alinhado com a mira quando a tampa está centrada
  add(new THREE.BoxGeometry(R * 0.28, thick * 1.35, R * 0.14), dark, 0, R * 0.58, thick * 0.15, face);
  add(new THREE.BoxGeometry(R * 0.34, R * 0.05, thick * 0.4), brass, 0, R * 0.72, thick * 0.05, face);
  add(new THREE.BoxGeometry(R * 0.34, R * 0.05, thick * 0.4), brass, 0, R * 0.44, thick * 0.05, face);
  // alça e casco, do lado de quem segura (+Z, para a câmera)
  add(new THREE.BoxGeometry(R * 0.14, R * 0.55, thick * 1.3), wood, 0, -R * 0.05, thick * 1.1, face);
  add(new THREE.SphereGeometry(R * 0.18, 10, 8), skin, R * 0.22, -R * 0.42, thick * 1.7, face);
  // rebite
  for (const [x, y] of [[-0.62, 0.55], [0.62, 0.55], [-0.62, -0.55], [0.62, -0.55]]) {
    add(new THREE.CylinderGeometry(R * 0.06, R * 0.06, thick * 0.5, 6), brass, x * R, y * R, thick * 0.35, face).rotation.x = Math.PI / 2;
  }
  // +Z é o lado da câmera (e o lado que o inimigo vê na terceira pessoa).
  // A chapa vai até thick/2; amassado e rachadura ficam pra fora dela, senão somem atrás do ferro.
  const faceZ = thick * 0.72;
  const dents = new THREE.Group(); face.add(dents); dents.visible = false;
  add(new THREE.SphereGeometry(R * 0.22, 8, 6), toon(0x2a2e34), -R * 0.32, -R * 0.08, faceZ, dents);
  add(new THREE.SphereGeometry(R * 0.14, 8, 6), toon(0x24282e), R * 0.26, R * 0.2, faceZ, dents);
  const cracks = new THREE.Group(); face.add(cracks); cracks.visible = false;
  const crack = (x, y, len, rot) => {
    const m = add(new THREE.BoxGeometry(R * 0.07, len, thick * 0.85), dark, x, y, faceZ, cracks);
    m.rotation.z = rot; return m;
  };
  crack(-R * 0.02, R * 0.02, R * 0.95, 0.55);
  crack(R * 0.16, -R * 0.18, R * 0.7, -0.9);
  crack(-R * 0.22, -R * 0.22, R * 0.5, 0.15);
  const shards = new THREE.Group(); g.add(shards); shards.visible = false;
  const shard = (sx, sy, sz, rx, ry) => {
    const m = add(new THREE.CylinderGeometry(R * 0.28, R * 0.2, thick, 5), iron, sx, sy, sz, shards);
    m.rotation.set(Math.PI / 2 + rx, ry, 0);
    m.userData.home = { x: sx, y: sy, z: sz, rx: m.rotation.x, ry, rz: 0 };
    return m;
  };
  shard(-R * 0.2, R * 0.1, faceZ, 0.4, 0.3);
  shard(R * 0.25, -R * 0.05, faceZ, -0.5, -0.4);
  shard(0, -R * 0.3, faceZ, 0.2, 1);
  g.scale.y = oval;
  const ironHex = 0x8a9098;
  g.userData.setStage = (stage) => {
    const broken = stage >= 3;
    face.visible = !broken; shards.visible = broken;
    dents.visible = stage >= 1 && !broken; cracks.visible = stage >= 2 && !broken;
    disc.material.color.setHex(stage >= 2 ? 0x4e545c : stage >= 1 ? 0x62686f : ironHex);
    if (!broken) shards.children.forEach((m) => { const h = m.userData.home; if (!h) return; m.position.set(h.x, h.y, h.z); m.rotation.set(h.rx, h.ry, h.rz); m.scale.setScalar(1); });
  };
  // k = 1 no instante da quebra, 0 quando os cacos já saíram. A pistola entra no fim.
  g.userData.tickBreak = (k) => {
    const fly = 1 - Math.max(0, Math.min(1, k));
    shards.children.forEach((m, i) => {
      const h = m.userData.home; if (!h) return;
      m.position.set(h.x * (1 + fly * 2.6), h.y * (1 + fly * 1.8) + fly * 0.22, h.z + fly * (0.62 + i * 0.14));
      m.rotation.set(h.rx + fly * 2.4, h.ry + fly, fly * (2.2 + i));
      m.scale.setScalar(Math.max(0.08, 1 - fly * 0.9));
    });
  };
  g.userData.setStage(0);
  return g;
}

export function makeFPShield() { return makeShieldMesh({ radius: 0.46, thick: 0.07, oval: 1.18, name: 'fp-tampa' }); }
export function makeWorldShield() { return makeShieldMesh({ radius: 0.42, thick: 0.06, oval: 1.48, name: 'tampa' }); }
