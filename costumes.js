// Peças de fantasia do Docão. Cada função recebe (opções da skin, rig) e devolve um Object3D
// (userData.anchor = 'head' para prender na cabeça) ou null quando só altera o rig.
// A identidade do Docão (cabeça, focinho, orelhas, bochechas, olhos, contorno) nunca é removida.
import * as THREE from 'three';
import { PARTS, SHIRT_DETAILS, toon, toonWarm, basic, outline, canvasTex, headR, headPoint, HEAD, TORSO_PTS, torsoR, gloveMat, addSparkles } from './docao.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2, TAU = Math.PI * 2;
const M = (geo, mat, parent, th = 0.01) => { const m = new THREE.Mesh(geo, mat); if (parent) parent.add(m); if (th) outline(m, th); m.castShadow = true; return m; };
const onHead = (g) => { g.userData.anchor = 'head'; return g; };
const hideTuft = (rig) => rig.tuft.forEach((t) => (t.visible = false));
function lathe(pts, opts = {}) { return new THREE.LatheGeometry(pts.map(([r, y]) => new V2(r, y)), opts.seg || 40, opts.phiStart || 0, opts.phiLength || TAU); }
function stripeTex(colors, n = 8, horizontal = false) {
  return canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = colors[i % colors.length]; if (horizontal) x.fillRect(0, i * h / n, w, h / n + 1); else x.fillRect(i * w / n, 0, w / n + 1, h); } });
}

Object.assign(PARTS, {
  // ---------- chapéus ----------
  fedora(o, rig) {
    hideTuft(rig); const g = new THREE.Group(); const m = toon(o.color || '#15151a'), band = toon(o.band || '#f4f4f4');
    const crown = M(lathe([[0.001, 0.32], [0.16, 0.31], [0.27, 0.27], [0.31, 0.16], [0.34, 0.02], [0.35, 0.0]]), m, g, 0.012);
    const dent = M(new THREE.SphereGeometry(0.12, 16, 8), toon('#0c0c10'), g, 0); dent.scale.set(1.6, 0.25, 0.6); dent.position.set(0, 0.315, -0.02);
    const brim = M(lathe([[0.33, 0.02], [0.5, 0.005], [0.66, 0.03], [0.68, 0.045], [0.66, 0.035], [0.5, -0.015], [0.33, -0.005]], { seg: 48 }), m, g, 0.01);
    brim.scale.z = 0.88;
    M(new THREE.CylinderGeometry(0.345, 0.352, 0.075, 40, 1, true), band, g, 0).position.y = 0.06;
    g.position.set(0, 1.9, -0.02); g.rotation.set(-0.1, 0, 0.12); return onHead(g);
  },
  bucketHat(o, rig) {
    hideTuft(rig); const g = new THREE.Group(); const m = toon(o.color || '#8a8a5c', { side: THREE.DoubleSide }), band = toon(o.band || '#5a5a38');
    M(lathe([[0.001, 0.27], [0.25, 0.265], [0.34, 0.22], [0.37, 0.1], [0.38, 0.0], [0.47, -0.07], [0.6, -0.14]], { seg: 44 }), m, g, 0.012);
    const b = M(new THREE.CylinderGeometry(0.375, 0.385, 0.07, 40, 1, true), band, g, 0); b.position.y = 0.04;
    for (const s of [-1, 1]) { const eye = M(new THREE.TorusGeometry(0.025, 0.008, 6, 12), basic('#c9c9c9'), g, 0); eye.position.set(s * 0.33, 0.15, 0.1); eye.rotation.y = s * 1.3; }
    // anzol decorativo
    const hook = M(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI * 1.4), basic('#d0d0d0'), g, 0); hook.position.set(0.27, 0.12, 0.25); hook.rotation.y = 0.8;
    g.position.set(0, 1.86, -0.02); g.rotation.x = -0.08; return onHead(g);
  },
  roundCap(o, rig) { // gorro redondo tradicional com nó no topo
    hideTuft(rig); const g = new THREE.Group(); const m = toon(o.color || '#15151a');
    const dome = M(new THREE.SphereGeometry(0.36, 32, 16, 0, TAU, 0, Math.PI / 2), m, g, 0.012); dome.scale.set(1, 0.62, 0.95);
    M(new THREE.CylinderGeometry(0.362, 0.362, 0.05, 40, 1, true), toon(o.band || '#15151a'), g, 0).position.y = 0.0;
    for (let i = 0; i < 6; i++) { const seam = M(new THREE.TorusGeometry(0.355, 0.006, 4, 24, Math.PI / 2), basic('#3a3a44'), g, 0); seam.rotation.y = i * Math.PI / 3; seam.scale.set(1, 0.62, 0.95); }
    M(new THREE.SphereGeometry(0.055, 14, 10), toon(o.knot || '#d0202a'), g, 0.008).position.y = 0.23;
    g.position.set(0, 1.86, -0.03); g.rotation.x = -0.15; return onHead(g);
  },
  hood(o, rig) { // capuz de fantasia com orelhas compridas de ponta preta
    hideTuft(rig); const g = new THREE.Group(); const c = o.color || '#ffd23a';
    const m = toonWarm(c, 0.15, { side: THREE.DoubleSide });
    // casca com abertura redonda para o rosto (o rosto do Docão fica 100% visível)
    const shell = M(new THREE.SphereGeometry(0.645, 44, 30, 0, TAU, 1.12, Math.PI - 1.12), m, g, 0.012);
    shell.rotation.x = Math.PI / 2 - 0.4; shell.scale.set(1.02, 1, 0.96);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(s * 0.22, 0.56, -0.1); ear.rotation.set(-0.2, 0, -s * 0.42); g.add(ear);
      const base = M(new THREE.CylinderGeometry(0.04, 0.12, 0.44, 18), m, ear, 0.01); base.position.y = 0.22; base.scale.z = 0.5;
      const tip = M(new THREE.ConeGeometry(0.04, 0.2, 18), toon(o.tip || '#1a1a1a'), ear, 0.01); tip.position.y = 0.54; tip.scale.z = 0.5;
      const dir = new V3(s * Math.sin(1.2), -0.12, Math.cos(1.2)).normalize(); const pos = dir.clone().multiplyScalar(0.66); pos.x *= 1.02; pos.z *= 0.96;
      const dot = M(new THREE.CircleGeometry(0.09, 20), toon(o.cheeks || '#e8322a'), g, 0); dot.position.copy(pos); dot.lookAt(pos.clone().add(dir));
    }
    g.position.set(0, 1.52, -0.02); return onHead(g);
  },
  longHair(o, rig) { // cabeleira de roqueiro
    hideTuft(rig); const g = new THREE.Group(); const c = o.color || '#3b2414'; const m = toonWarm(c, 0.1);
    const scalp = M(new THREE.SphereGeometry(0.6, 36, 18, 0, TAU, 0, Math.PI * 0.36), m, g, 0.012);
    scalp.position.set(0, 1.47, -0.06); scalp.rotation.x = -0.42; scalp.scale.set(1.0, 1.0, 0.98);
    let k = 0;
    for (const row of [{ y: 1.78, out: 0.07, len: 0.62 }, { y: 1.62, out: 0.13, len: 0.55 }]) {
      for (let a = -2.05; a <= 2.05; a += 0.27) {
        const th = Math.PI + a; const r = headR(row.y) + row.out;
        const lock = M(new THREE.CapsuleGeometry(0.095, row.len, 4, 10), m, g, 0.01);
        const px = r * Math.sin(th), pz = r * HEAD.zs * Math.cos(th);
        lock.position.set(px * 1.05, row.y - row.len * 0.45, pz * 1.05 - 0.02);
        lock.rotation.set(-Math.cos(th) * 0.28, 0, Math.sin(th) * 0.28 + ((k++ % 3) - 1) * 0.06);
        lock.scale.set(1, 1, 0.75);
      }
    }
    if (o.headband) { const hb = M(new THREE.TorusGeometry(0.5, 0.035, 8, 40), toon(o.headband), g, 0.008); hb.rotation.x = Math.PI / 2 - 0.42; hb.position.set(0, 1.84, -0.06); hb.scale.set(1.0, 0.92, 1); }
    return onHead(g);
  },

  // ---------- rosto ----------

  // ---------- mãos e pés ----------
  glove(o, rig) { // luva (ex.: uma luva branca brilhante)
    const sides = o.hand === 'both' ? [0, 1] : [(o.hand || 'right') === 'right' ? 0 : 1];
    for (const i of sides) {
      const { fist, thumb } = rig.fists[i]; const gm = gloveMat(o.color);
      fist.material = gm; thumb.material = gm; fist.scale.multiplyScalar(1.04);
      if (o.sparkle !== false) addSparkles(fist, 16, 0.158);
      const cuff = M(new THREE.TorusGeometry(0.12, 0.03, 8, 18), gm, rig.arms[i], 0.008); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.45;
    }
    return null;
  },
  shoes(o, rig) { // sapato (mocassim) cobrindo o casco
    const m = toon(o.color || '#111114');
    for (const leg of rig.legs) {
      const sh = M(new THREE.SphereGeometry(0.17, 18, 12), m, leg, 0.01); sh.position.set(0, -0.35, 0.07); sh.scale.set(1, 0.58, 1.45);
      const sole = M(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 18), toon('#2a2a2a'), leg, 0); sole.position.set(0, -0.43, 0.07); sole.scale.z = 1.45;
      const strap = M(new THREE.BoxGeometry(0.2, 0.025, 0.05), toon(o.strap || '#2a2a30'), leg, 0); strap.position.set(0, -0.29, 0.2);
    }
    return null;
  },
  socks(o, rig) {
    const m = toon(o.color || '#ffffff');
    for (const leg of rig.legs) { const s = M(new THREE.CylinderGeometry(0.142, 0.142, 0.12, 18), m, leg, 0.008); s.position.y = -0.26; }
    return null;
  },

  // ---------- corpo ----------
  epaulettes(o, rig) { // dragonas douradas nos ombros
    const m = toon(o.color || '#e8b830');
    for (const piv of rig.arms) {
      const pad = M(new THREE.CylinderGeometry(0.17, 0.19, 0.05, 24), m, piv, 0.008); pad.position.y = 0.04;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const f = M(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 5), m, piv, 0); f.position.set(Math.cos(a) * 0.18, -0.02, Math.sin(a) * 0.18); }
    }
    return null;
  },
  puffer(o, rig) { // jaqueta bufante oversized com capuz nas costas
    const g = new THREE.Group(); const c = o.color || '#202329'; const m = toonWarm(c, 0.12);
    const shell = M(new THREE.LatheGeometry(TORSO_PTS.map((p) => new V2(p.x * 1.05 + 0.01, p.y)), 40), m, g, 0.014); shell.scale.z = 0.88;
    for (let i = 0; i < 4; i++) {
      const y = 0.52 + i * 0.14; const r = torsoR(y) * 1.03 + 0.03;
      const ring = M(new THREE.TorusGeometry(r, 0.06, 10, 40), m, g, 0.008); ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.scale.y = 0.88;
    }
    const hood = M(new THREE.TorusGeometry(0.3, 0.11, 12, 28, Math.PI * 1.2), m, g, 0.01); hood.position.set(0, 1.12, -0.06); hood.rotation.set(Math.PI / 2 + 0.35, 0, Math.PI * -0.1 + Math.PI); 
    const zip = M(new THREE.BoxGeometry(0.03, 0.6, 0.02), basic(o.zipper || '#c9c9c9'), g, 0); zip.position.set(0, 0.76, 0.535); zip.rotation.x = -0.12;
    return g;
  },
  chain(o, rig) { // corrente grossa dourada com medalhão liso
    const g = new THREE.Group(); const gold = toonWarm(o.color || '#f2c230', 0.25, {}, '#ffb000');
    const a = 0.6; const ch = M(new THREE.TorusGeometry(0.34, 0.034, 10, 40), gold, g, 0.006); ch.rotation.x = -(Math.PI / 2 - a); ch.position.set(0, 1.06, 0.3);
    
    const med = new THREE.Group(); med.position.set(0, 0.75, 0.62); med.rotation.x = -0.25; g.add(med);
    const coin = M(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 32), gold, med, 0.008); coin.rotation.x = Math.PI / 2;
    M(new THREE.TorusGeometry(0.075, 0.012, 6, 28), toonWarm('#ffd860', 0.3), med, 0).position.z = 0.016;
    const bail = M(new THREE.TorusGeometry(0.03, 0.012, 6, 12), gold, med, 0); bail.position.y = 0.115;
    return g;
  },
  robe(o, rig) { // túnica longa de estudante de magia, aberta na frente
    if (rig.tail) rig.tail.visible = false; // rabinho fica por baixo da túnica
    const g = new THREE.Group(); const m = toonWarm(o.color || '#1b1b22', 0.1, { side: THREE.DoubleSide });
    const pts = [[0.24, 1.14], [0.42, 1.06], [0.53, 0.92], [0.56, 0.72], [0.59, 0.45], [0.64, 0.12], [0.66, 0.06]];
    const shell = M(lathe(pts, { phiStart: 0.42, phiLength: TAU - 0.84, seg: 44 }), m, g, 0.012); shell.scale.z = 0.92;
    const lin = new THREE.Mesh(lathe(pts.map(([r, y]) => [r * 0.985, y]), { phiStart: 0.42, phiLength: TAU - 0.84, seg: 44 }), toon(o.lining || '#8b1a1a', { side: THREE.BackSide })); lin.scale.z = 0.92; g.add(lin);
    const hood = M(new THREE.TorusGeometry(0.28, 0.08, 10, 24, Math.PI), m, g, 0.008); hood.position.set(0, 1.1, -0.12); hood.rotation.set(Math.PI / 2 + 0.6, 0, Math.PI);
    return g;
  },
  scarf(o, rig) { // cachecol listrado
    const g = new THREE.Group(); const cols = o.colors || ['#8b1a1a', '#d4a537'];
    const t1 = stripeTex(cols, 16), t2 = stripeTex(cols, 8, true);
    const ring = M(new THREE.TorusGeometry(0.29, 0.075, 12, 36), toon('#ffffff', { map: t1 }), g, 0.01); ring.rotation.x = Math.PI / 2; ring.position.y = 1.1; ring.scale.y = 0.9;
    for (const [x, rz, len] of [[0.12, 0.08, 0.46], [0.22, -0.05, 0.38]]) { const tail = M(new THREE.BoxGeometry(0.13, len, 0.04), toon('#ffffff', { map: t2 }), g, 0.008); tail.position.set(x, 1.08 - len / 2, 0.42); tail.rotation.set(-0.25, 0, rz); }
    return g;
  },
  wand(o, rig) { // varinha guardada no cinto
    const g = new THREE.Group(); const m = toon(o.color || '#6b4423');
    M(new THREE.CylinderGeometry(0.012, 0.02, 0.4, 8), m, g, 0.006).position.y = 0;
    M(new THREE.CylinderGeometry(0.024, 0.024, 0.1, 8), toon('#3e2614'), g, 0.006).position.y = -0.15;
    g.position.set(-0.4, 0.58, 0.22); g.rotation.set(0.2, 0, -0.35); return g;
  },
  mandarinCollar(o, rig) {
    const g = new THREE.Group(); const m = toon(o.color || '#b3121b');
    M(new THREE.CylinderGeometry(0.25, 0.28, 0.1, 32, 1, true), toon(o.color || '#b3121b', { side: THREE.DoubleSide }), g, 0.008).position.y = 1.13;
    const e = M(new THREE.TorusGeometry(0.25, 0.012, 6, 32), toon(o.edge || '#f2c14e'), g, 0); e.rotation.x = Math.PI / 2; e.position.y = 1.18;
    return g;
  },
  vest(o, rig) { // colete de pescador com bolsos
    const g = new THREE.Group(); const c = o.color || '#c2ae7e'; const m = toonWarm(c, 0.1, { side: THREE.DoubleSide }); const dark = toon(o.pocket || '#a8925e');
    const pts = TORSO_PTS.filter((p) => p.y > 0.5 && p.y < 1.1).map((p) => new V2(p.x * 1.05 + 0.02, p.y));
    const shell = M(new THREE.LatheGeometry(pts, 40, 0.45, TAU - 0.9), m, g, 0.012); shell.scale.z = 0.88;
    for (const s of [-1, 1]) for (const y of [0.68, 0.9]) {
      const th = s * 0.68; const r = torsoR(y) * 1.05 + 0.03;
      const pk = new THREE.Group(); const pos = new V3(r * Math.sin(th), y, r * 0.88 * Math.cos(th)); pk.position.copy(pos); pk.lookAt(pos.clone().add(new V3(Math.sin(th), 0, 0.88 * Math.cos(th)))); g.add(pk);
      M(new THREE.BoxGeometry(0.17, 0.15, 0.05), dark, pk, 0.008).position.z = 0.02;
      const flap = M(new THREE.BoxGeometry(0.18, 0.05, 0.06), m, pk, 0.006); flap.position.set(0, 0.075, 0.035);
      M(new THREE.SphereGeometry(0.012, 6, 6), basic('#444'), pk, 0).position.set(0, 0.065, 0.07);
    }
    const ring = M(new THREE.TorusGeometry(0.03, 0.008, 6, 12), basic('#cfcfcf'), g, 0); ring.position.set(-0.3, 1.0, 0.38);
    return g;
  },
  fish(o, rig) { // peixe pendurado no cinto
    const g = new THREE.Group(); const m = toonWarm(o.color || '#7fb3d5', 0.15);
    M(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), basic('#e8e8e8'), g, 0).position.y = -0.08;
    const body = M(new THREE.SphereGeometry(0.1, 18, 12), m, g, 0.008); body.scale.set(0.55, 1.6, 1); body.position.y = -0.3;
    const tail = M(new THREE.ConeGeometry(0.08, 0.12, 3), m, g, 0.008); tail.position.y = -0.5; tail.scale.z = 0.3;
    for (const s of [-1, 1]) M(new THREE.SphereGeometry(0.014, 6, 6), basic('#111'), g, 0).position.set(s * 0.05, -0.2, 0.03);
    const belly = M(new THREE.SphereGeometry(0.06, 10, 8), toon('#e8f0f4'), g, 0); belly.scale.set(0.4, 1.6, 0.8); belly.position.set(0, -0.31, 0.04);
    g.position.set(0.43, 0.56, 0.12); g.rotation.z = 0.12; return g;
  },
  boltTail(o, rig) { // rabo em forma de raio (substitui o rabinho enrolado só nessa fantasia)
    if (rig.tail) rig.tail.visible = false;
    const pts = [[0, 0], [0.1, 0], [0.07, 0.17], [0.23, 0.17], [0.15, 0.34], [0.33, 0.34], [0.12, 0.64], [0.16, 0.44], [-0.01, 0.44], [0.07, 0.27], [-0.08, 0.27]];
    const sh = new THREE.Shape(pts.map(([x, y]) => new V2(x, y)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    const g = new THREE.Group(); M(geo, toonWarm(o.color || '#ffd23a', 0.15), g, 0.008);
    const base = M(new THREE.BoxGeometry(0.13, 0.08, 0.08), toon(o.base || '#7a4a1c'), g, 0.006); base.position.set(0.05, 0.03, 0.025);
    g.position.set(0, 0.58, -0.4); g.rotation.set(0, Math.PI / 2, 0.25); g.scale.setScalar(1.25); return g;
  },
});

// ---------- estampas novas na camiseta/macacão ----------
Object.assign(SHIRT_DETAILS, {
  bones(x, d, PT, W) { // macacão de esqueleto: costelas, coluna e bacia em branco + brilho verde
    const c = d.color || '#f7f7f2', glow = d.glow || '#8dff6a';
    const line = (pts, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(...p) : x.moveTo(...p))); x.stroke(); };
    for (const [col, extra] of [[glow, 8], [c, 0]]) {
      line([PT(0, 1.08), PT(0, 0.5)], 18 + extra, col); // coluna/esterno
      for (let i = 0; i < 4; i++) { const y = 1.0 - i * 0.1; for (const s of [-1, 1]) line([PT(0, y), PT(s * 0.25, y - 0.015), PT(s * 0.48, y - 0.06)], 13 + extra, col); } // costelas (frente)
      for (const s of [-1, 1]) line([PT(s * 0.18, 0.5), PT(s * 0.38, 0.44), PT(s * 0.32, 0.4)], 15 + extra, col); // bacia
      line([PT(Math.PI, 1.08), PT(Math.PI, 0.45)], 16 + extra, col); // coluna nas costas
      for (let i = 0; i < 5; i++) { const y = 1.0 - i * 0.1; line([PT(Math.PI - 0.3, y), PT(Math.PI + 0.3, y)], 10 + extra, col); }
    }
    for (let i = 0; i < 6; i++) { const p = PT(0, 1.04 - i * 0.1); x.fillStyle = '#1a1a1a'; x.fillRect(p[0] - 9, p[1] - 2, 18, 4); } // vértebras
  },
  tunicWrap(x, d, PT) { // túnica em camadas: lapelas cruzadas
    const c = d.color || '#b89f72', c2 = d.inner || '#efe3c6';
    x.fillStyle = c2; x.beginPath(); x.moveTo(...PT(-0.28, 1.12)); x.lineTo(...PT(0.28, 1.12)); x.lineTo(...PT(0, 0.82)); x.closePath(); x.fill();
    for (const s of [-1, 1]) { x.fillStyle = c; x.beginPath(); x.moveTo(...PT(s * 0.3, 1.12)); x.lineTo(...PT(s * 0.18, 1.12)); x.lineTo(...PT(-s * 0.22, 0.56)); x.lineTo(...PT(-s * 0.36, 0.56)); x.closePath(); x.fill(); }
    x.strokeStyle = 'rgba(60,40,20,.45)'; x.lineWidth = 4; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(...PT(s * 0.18, 1.12)); x.lineTo(...PT(-s * 0.22, 0.56)); x.stroke(); }
  },
  stillsuit(x, d, PT, W) { // traje de deserto: nervuras, painéis, tubos e válvulas
    const rib = d.rib || '#1b1d20', tube = d.tube || '#8a8f96', panel = d.panel || '#3a3e44';
    for (const s of [-1, 1]) { x.fillStyle = panel; x.beginPath(); x.moveTo(...PT(s * 0.12, 1.02)); x.lineTo(...PT(s * 0.5, 0.98)); x.lineTo(...PT(s * 0.52, 0.72)); x.lineTo(...PT(s * 0.14, 0.76)); x.closePath(); x.fill(); }
    x.strokeStyle = rib; x.lineWidth = 5; for (let y = 0.45; y < 1.1; y += 0.045) { const a = PT(-Math.PI, y), b = PT(Math.PI, y); if (Math.abs(y - 0.87) < 0.15) continue; x.beginPath(); x.moveTo(0, a[1]); x.lineTo(W, b[1]); x.stroke(); }
    x.strokeStyle = tube; x.lineWidth = 12; x.lineCap = 'round';
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(...PT(s * 0.08, 0.5)); x.bezierCurveTo(...PT(s * 0.22, 0.7), ...PT(s * 0.06, 0.9), ...PT(s * 0.2, 1.1)); x.stroke(); }
    x.fillStyle = '#c9cdd2'; for (const s of [-1, 1]) for (const y of [0.62, 0.95]) { const p = PT(s * 0.33, y); x.beginPath(); x.arc(p[0], p[1], 10, 0, Math.PI * 2); x.fill(); x.strokeStyle = rib; x.lineWidth = 3; x.stroke(); }
    const b = PT(0, 0.52); x.fillStyle = '#4a4036'; x.fillRect(0, b[1] - 12, W, 24); // cinto
  },
});

Object.assign(PARTS, {
  // ---------- Fantasminha ----------
  ghostSheet(o, rig) { // lençol de fantasma: capuz com abertura pro rosto + manto até perto do chão com barra ondulada e brilho ciano
    hideTuft(rig); const g = new THREE.Group(); const c = o.color || '#f6fbff';
    const sheetM = toonWarm(c, 0.18, { side: THREE.DoubleSide, transparent: true, opacity: o.opacity || 0.93 }, '#bdf6ff');
    const rimM = new THREE.MeshBasicMaterial({ color: o.rim || '#bff8ff', transparent: true, opacity: 0.45, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending });
    // capuz (rosto, focinho, olhos e orelhas aparecem)
    const hoodG = new THREE.Group(); hoodG.position.set(0, 1.52, -0.02); hoodG.userData.anchor = 'head';
    const hoodM = toonWarm(c, 0.18, { side: THREE.DoubleSide }, '#bdf6ff');
    const shell = M(new THREE.SphereGeometry(0.64, 44, 30, 0, TAU, 0.92, Math.PI - 0.92), hoodM, hoodG, 0.012); shell.rotation.x = Math.PI / 2 - 0.22; shell.scale.set(1.03, 1.02, 0.97);
    // dobrinhas do lençol caindo dos lados do rosto
    for (const sx of [-1, 1]) { const fold = M(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), hoodM, hoodG, 0.008); fold.position.set(sx * 0.5, -0.32, 0.28); fold.rotation.set(0.2, 0, sx * 0.25); }
    rig.head.add(hoodG);
    // manto com barra ondulada
    const pts = [[0.26, 1.2], [0.48, 1.1], [0.58, 0.92], [0.63, 0.65], [0.68, 0.38], [0.72, 0.2], [0.73, 0.14]];
    const geo = lathe(pts, { seg: 56 }); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0.4) { const th = Math.atan2(pos.getX(i), pos.getZ(i)); const k = (0.4 - y) / 0.26; pos.setY(i, y + Math.sin(th * 7) * 0.07 * k); const rr = 1 + Math.cos(th * 7) * 0.04 * k; pos.setX(i, pos.getX(i) * rr); pos.setZ(i, pos.getZ(i) * rr); } }
    geo.computeVertexNormals();
    const drape = M(geo, sheetM, g, 0.012); drape.scale.z = 0.9;
    const glow = new THREE.Mesh(geo, rimM); glow.scale.set(1.05, 1.0, 0.95); g.add(glow);
    if (rig.tail) rig.tail.visible = false; // rabinho fica embaixo do lençol
    g.userData.float = true; return g;
  },
  // ---------- Esqueletão ----------
  boneLimbs(o, rig) { // ossos pintados nas mangas e nas pernas do macacão
    const bm = basic(o.color || '#f7f7f2'), glow = new THREE.MeshBasicMaterial({ color: o.glow || '#8dff6a', transparent: true, opacity: 0.55 });
    const bone = (parent, x, y0, y1, z, r = 0.03) => {
      const sh = M(new THREE.CapsuleGeometry(r, y0 - y1, 4, 8), bm, parent, 0.004); sh.position.set(x, (y0 + y1) / 2, z);
      for (const y of [y0, y1]) for (const k of [-1, 1]) M(new THREE.SphereGeometry(r * 1.35, 10, 8), bm, parent, 0.004).position.set(x + k * r, y, z);
      const gl = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.9, y0 - y1, 4, 8), glow); gl.position.set(x, (y0 + y1) / 2, z - 0.012); parent.add(gl);
    };
    for (const piv of rig.arms) bone(piv, 0, -0.05, -0.38, 0.16, 0.026);
    for (const leg of rig.legs) {
      M(new THREE.CapsuleGeometry(0.145, 0.16, 4, 14), toon(o.suit || '#16161a'), leg, 0.01).position.y = -0.17; // perna do macacão
      bone(leg, 0, -0.04, -0.28, 0.15, 0.028);
    }
    return null;
  },
  // ---------- Cavaleiro Galáctico ----------
  sash(o, rig) { // faixa/cinto largo marrom com fivela e pontas
    const g = new THREE.Group(); const m = toon(o.color || '#6b4a2b');
    const r = torsoR(0.56) * 1.02 + 0.03; const band = M(new THREE.CylinderGeometry(r, r * 1.02, 0.14, 40, 1, true), toon(o.color || '#6b4a2b', { side: THREE.DoubleSide }), g, 0.008); band.position.y = 0.56; band.scale.z = 0.88;
    const belt = M(new THREE.TorusGeometry(r + 0.01, 0.022, 6, 40), toon(o.belt || '#3e2a18'), g, 0); belt.rotation.x = Math.PI / 2; belt.position.y = 0.53; belt.scale.y = 0.88;
    const buckle = M(new THREE.BoxGeometry(0.1, 0.07, 0.03), toon(o.buckle || '#c9c2b0'), g, 0.006); buckle.position.set(0, 0.53, r * 0.88 + 0.02);
    for (const [x, y] of [[0.3, 0.62], [-0.3, 0.62]]) { const pouch = M(new THREE.BoxGeometry(0.09, 0.08, 0.05), m, g, 0.006); pouch.position.set(x, 0.52, r * 0.82); pouch.rotation.y = x > 0 ? 0.5 : -0.5; }
    const tab = M(new THREE.BoxGeometry(0.16, 0.3, 0.03), toon(o.tabard || '#b89f72'), g, 0.006); tab.position.set(0, 0.36, r * 0.88 - 0.01); tab.rotation.x = -0.05;
    return g;
  },
  laserSword(o, rig) { // espada laser presa no cinto (lâmina brilhante)
    const g = new THREE.Group();
    const metal = toon('#c9ccd2'), dark = toon('#2a2c30');
    M(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 14), metal, g, 0.006);
    for (const y of [-0.06, -0.02, 0.02]) M(new THREE.CylinderGeometry(0.033, 0.033, 0.018, 14), dark, g, 0).position.y = y;
    M(new THREE.CylinderGeometry(0.036, 0.03, 0.04, 14), dark, g, 0.005).position.y = 0.12;
    const bladeC = o.blade || '#7DF9FF';
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.62, 12), basic('#f2ffff')); blade.position.y = 0.45; g.add(blade);
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.66, 14), new THREE.MeshBasicMaterial({ color: bladeC, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.y = 0.45; g.add(halo);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), halo.material); tip.position.y = 0.78; g.add(tip);
    g.position.set(-0.47, 0.5, 0.12); g.rotation.set(0.35, 0, 2.55); return g; // lâmina pra baixo e pra trás
  },
  armWraps(o, rig) { // faixas enroladas nas mangas (também aparecem nos braços em 1ª pessoa)
    const m = toon(o.color || '#6b4a2b');
    for (const piv of rig.arms) for (const y of o.ys || [-0.14, -0.26, -0.38]) { const w = M(new THREE.TorusGeometry(0.15, 0.022, 8, 20), m, piv, 0.004); w.rotation.x = Math.PI / 2; w.position.y = y; }
    return null;
  },
  hoodDown(o, rig) { // capuz abaixado, amontoado nas costas da capa
    const g = new THREE.Group(); const m = toonWarm(o.color || '#5a3b22', 0.1, { side: THREE.DoubleSide });
    const h = M(new THREE.SphereGeometry(0.3, 28, 16, 0, TAU, 0, Math.PI * 0.62), m, g, 0.01); h.scale.set(1.25, 0.75, 0.55); h.rotation.x = Math.PI * 0.92;
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), toon(o.inner || '#3e2716')); inner.scale.set(1.3, 0.55, 1); inner.position.set(0, 0.07, 0.02); inner.rotation.x = -Math.PI / 2 + 0.3; g.add(inner);
    g.position.set(0, 0.98, -0.44); return g;
  },
  // ---------- Nômade do Deserto ----------
  noseTube(o, rig) { // tubo do traje que sobe do colarinho até o lado do focinho (sem cobrir o focinho)
    const g = new THREE.Group(); g.userData.anchor = 'head'; const m = toon(o.color || '#3a3e44');
    for (const s of [-1, 1]) {
      const end = headPoint(s * 0.42, 1.4, 0.03);
      const curve = new THREE.CatmullRomCurve3([new V3(s * 0.2, 1.1, 0.32), headPoint(s * 0.85, 1.16, 0.035), headPoint(s * 0.7, 1.27, 0.03), end]);
      M(new THREE.TubeGeometry(curve, 28, 0.02, 8, false), m, g, 0.006);
      const plug = M(new THREE.SphereGeometry(0.034, 12, 10), toon(o.plug || '#8a8f96'), g, 0.005); plug.position.copy(end);
    }
    return g;
  },
  desertScarf(o, rig) { // lenço de areia enrolado no pescoço com ponta caída
    const g = new THREE.Group(); const m = toonWarm(o.color || '#c9a66b', 0.12);
    for (const [y, r] of [[1.1, 0.3], [1.17, 0.27]]) { const t = M(new THREE.TorusGeometry(r, 0.07, 10, 32), m, g, 0.008); t.rotation.x = Math.PI / 2; t.position.y = y; t.scale.y = 0.88; }
    const tail = M(new THREE.BoxGeometry(0.2, 0.42, 0.04), m, g, 0.008); tail.position.set(0.28, 0.9, -0.28); tail.rotation.set(0.25, -0.6, -0.15);
    return g;
  },
});
