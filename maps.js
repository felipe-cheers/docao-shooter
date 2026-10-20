// ============================================================
//  MAPAS DO DOCÃO SHOOTER: só dados (geometria original).
//  Cada mapa: id, name (pt-BR), desc, size [meia-largura X, meia-profundidade Z], wallH (muro do limite),
//  palette (céu/neblina/luz/chão), boxes (caixas/rampas), props (objetos decorativos/cobertura),
//  spawns [[x, z, y]], pickups [[tipo, x, z, y]] (health | ammo | grenade), waypoints extras [[x, y, z]],
//  showcase [x, y, z] (onde o Docão fica no menu), view [x, y, z, yaw, pitch] (câmera de screenshot),
//  test (pontos usados pelo teste automático de escadas/andares).
//  O grafo de navegação dos bots é gerado automaticamente a partir da geometria (nav.js) + waypoints extras.
// ============================================================

// ---------- mini kit de montagem ----------
// caixa: B(x0, z0, x1, z1, altura, cor, y0)
export const B = (x0, z0, x1, z1, h, c, y0 = 0) => ({ b: [Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y0 + h, Math.max(z0, z1)], c });
// rampa (cunha): sobe de y0 a y1 ao longo do eixo 'x' ou 'z' no sentido dir (+1 / -1)
export const R = (x0, z0, x1, z1, y0, y1, axis, dir, c) => ({ b: [Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1)], c, ramp: { axis, dir } });
export const door = (a, b, h = 2.8) => ({ a, b, y0: 0, y1: h });
export const win = (a, b, lo = 1.0, hi = 2.2) => ({ a, b, y0: lo, y1: hi });
// parede ao longo de X (na linha z) / ao longo de Z (na linha x), com aberturas (portas/janelas)
function wallAlong(axis, s0, s1, line, t, h, c, openings = [], y0 = 0) {
  const out = []; let cur = s0;
  const box = (a, b, ya, yb) => {
    if (b - a < 0.01 || yb - ya < 0.01) return;
    out.push(axis === 'x' ? { b: [a, y0 + ya, line - t / 2, b, y0 + yb, line + t / 2], c } : { b: [line - t / 2, y0 + ya, a, line + t / 2, y0 + yb, b], c });
  };
  for (const o of [...openings].sort((p, q) => p.a - q.a)) {
    box(cur, o.a, 0, h); if (o.y0 > 0) box(o.a, o.b, 0, o.y0); if (o.y1 < h) box(o.a, o.b, o.y1, h); cur = o.b;
  }
  box(cur, s1, 0, h); return out;
}
export const wallX = (x0, x1, z, t, h, c, op, y0) => wallAlong('x', x0, x1, z, t, h, c, op, y0);
export const wallZ = (z0, z1, x, t, h, c, op, y0) => wallAlong('z', z0, z1, x, t, h, c, op, y0);
// transformações de grupos de caixas (para espelhar bases/casas)
export function rot180(list, cx, cz) {
  return list.map((o) => { const [x0, y0, z0, x1, y1, z1] = o.b; return { ...o, b: [2 * cx - x1, y0, 2 * cz - z1, 2 * cx - x0, y1, 2 * cz - z0], ramp: o.ramp ? { ...o.ramp, dir: -o.ramp.dir } : undefined }; });
}
export function mirrorZ(list) {
  return list.map((o) => { const [x0, y0, z0, x1, y1, z1] = o.b; return { ...o, b: [x0, y0, -z1, x1, y1, -z0], ramp: o.ramp ? { ...o.ramp, dir: o.ramp.axis === 'z' ? -o.ramp.dir : o.ramp.dir } : undefined }; });
}
// casa de 2 andares (frente pro +z), escada interna junto da parede de trás, laje do 2º andar com vão da escada
export function house(x0, z0, x1, z1, col) {
  const t = 0.6, H1 = 3.2, cx = (x0 + x1) / 2, out = [];
  const { wall, floor, roof, stair, trim } = col;
  out.push(...wallX(x0, x1, z0 + t / 2, t, H1, wall, [win(x1 - 3.4, x1 - 1.4)]));
  out.push(...wallX(x0, x1, z1 - t / 2, t, H1, wall, [win(x0 + 1.6, x0 + 4.2), door(cx - 1.3, cx + 1.3, 2.6), win(x1 - 4.2, x1 - 1.6)]));
  out.push(...wallZ(z0 + t, z1 - t, x0 + t / 2, t, H1, wall, [win(z0 + 4.6, z0 + 7.0)]));
  out.push(...wallZ(z0 + t, z1 - t, x1 - t / 2, t, H1, wall, [door(z0 + 5.2, z0 + 7.4, 2.6)]));
  const rs = x0 + 1.0, re = rs + 9.6, s0 = z0 + t, s1 = s0 + 2.8;
  out.push(R(rs, s0, re, s1, 0, 3.5, 'x', 1, stair));
  out.push(B(x0, s1, x1, z1, 0.3, floor, 3.2), B(re, z0, x1, s1, 0.3, floor, 3.2), B(x0, z0, rs, s1, 0.3, floor, 3.2));
  const U = 3.5, H2 = 2.6;
  out.push(...wallX(x0, x1, z0 + t / 2, t, H2, wall, [win(x0 + 2, x0 + 4, 0.9, 2.0), win(x1 - 4, x1 - 2, 0.9, 2.0)], U));
  out.push(...wallX(x0, x1, z1 - t / 2, t, H2, wall, [win(x0 + 1.5, x0 + 5.5, 0.8, 2.0), win(x1 - 5.5, x1 - 1.5, 0.8, 2.0)], U));
  out.push(...wallZ(z0 + t, z1 - t, x0 + t / 2, t, H2, wall, [win(z0 + 3.5, z0 + 6.5, 0.8, 2.0)], U));
  out.push(...wallZ(z0 + t, z1 - t, x1 - t / 2, t, H2, wall, [win(z0 + 3.5, z0 + 6.5, 0.8, 2.0)], U));
  out.push(B(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, 0.35, roof, U + H2));
  out.push(B(x0 - 0.2, z1, x1 + 0.2, z1 + 0.25, 0.25, trim, H1)); // friso entre andares
  return out;
}

const DAY = (o) => ({ sky: '#8fd3ff', fog: ['#8fd3ff', 50, 130], hemi: ['#ffffff', '#6a8f4a', 1.6], sun: ['#ffffff', 2.2], clouds: true, ...o });

// =====================================================================
export const MAPS = [];

// ---------- 1) Arena da Fazendinha (o mapa original) ----------
{
  const H = 36, boxes = [];
  boxes.push(B(-5, -5, 5, 5, 3, '#9b7bd6'), R(-1.75, 5, 1.75, 13, 0, 3, 'z', -1, '#b59be6'), R(-1.75, -13, 1.75, -5, 0, 3, 'z', 1, '#b59be6'));
  boxes.push(B(19, 19, 26, 26, 2.2, '#4fb3c9'), R(12, 21, 19, 24, 0, 2.2, 'x', 1, '#7fd3e3'));
  boxes.push(B(-26, -26, -19, -19, 2.2, '#4fb3c9'), R(-19, -24, -12, -21, 0, 2.2, 'x', -1, '#7fd3e3'));
  boxes.push(B(19, -26, 26, -19, 2.2, '#f28fb0'), R(21, -19, 24, -12, 0, 2.2, 'z', -1, '#f7b3c9'));
  boxes.push(B(-26, 19, -19, 26, 2.2, '#f28fb0'), R(-24, 12, -21, 19, 0, 2.2, 'z', 1, '#f7b3c9'));
  for (const [a, b, c, d] of [[-16, -3, -15, 3], [15, -3, 16, 3], [-3, -17, 3, -16], [-3, 16, 3, 17], [-30, -8, -29, 0], [29, 0, 30, 8], [8, 26, 16, 27], [-16, -27, -8, -26]]) boxes.push(B(a, b, c, d, 2.6, '#5dade2'));
  for (const [x, z] of [[-9, 9], [9, -9], [-10, -10], [10, 10], [-24, 4], [24, -4], [4, 26], [-4, -26], [-30, 25], [30, -25], [0, 30], [0, -31]]) boxes.push(B(x - 1, z - 0.6, x + 1, z + 0.6, 1.2, '#f2c94c'));
  for (const [x, z] of [[-7, 18], [7, -18], [18, 7], [-18, -7], [-28, -16], [28, 16], [14, -30], [-14, 30], [-12, 4], [12, -4]]) boxes.push(B(x - 0.75, z - 0.75, x + 0.75, z + 0.75, 1.5, '#b5793e'));
  boxes.push(B(-8.5, 17.25, -7.5, 18.25, 1, '#c98a4b', 1.5), B(6.5, -18.75, 7.5, -17.75, 1, '#c98a4b', 1.5));
  for (const sx of [-3.5, 3.5]) for (const sz of [-H + 0.3, H - 0.3]) boxes.push(B(sx - 0.2, sz - 0.2, sx + 0.2, sz + 0.2, 2.8, '#8b5a2b', 4));
  MAPS.push({
    id: 'arena', name: 'Arena da Fazendinha', desc: 'O clássico: plataforma central, torres nos cantos e feno pra todo lado.',
    size: [H, H], wallH: 4, wallColor: ['#e86a5c', '#d85a4c'],
    palette: DAY({ ground: '#7cc95a', tiles: ['#a9e07f', '#9bd972', 72, 12] }),
    boxes, props: [{ t: 'logoSign', x: 0, y: 5.2, z: -H + 0.02, rot: 0 }, { t: 'logoSign', x: 0, y: 5.2, z: H - 0.02, rot: Math.PI }],
    spawns: [[-30, -30], [30, 30], [-30, 30], [30, -30], [0, 22], [0, -22], [-20, 0], [20, 0], [-12, -30], [12, 30]],
    pickups: [['health', 0, 0, 3], ['health', -22.5, 22.5, 2.2], ['health', 22.5, -22.5, 2.2], ['health', 31, 31], ['health', -31, -31],
      ['ammo', 22.5, 22.5, 2.2], ['ammo', -22.5, -22.5, 2.2], ['ammo', -13, 0], ['ammo', 13, 0], ['ammo', 0, 20], ['ammo', 0, -20],
      ['grenade', 16, 16], ['grenade', -16, -16], ['grenade', -16, 16], ['grenade', 16, -16], ['grenade', 3.5, 3.5, 3], ['grenade', 0, -27]],
    showcase: [0, 3, 0], view: [6, 0, 30, 0.15, -0.05],
    test: { stairs: { from: [0, 0, 12], to: [0, 3, 2], level: 3 } },
  });
}

// ---------- 2) Duas Pocilgas (duas praças-alvo, corredor longo, portas no meio, passarela) ----------
{
  const sand = '#d8b077', wall = '#c99a5b', wall2 = '#b98b4e', crate = '#9c6b3a', crate2 = '#b07a45', plat = '#e0c08a', boxes = [];
  // quarteirões que formam os corredores
  boxes.push(B(-26, -8, -10, 22, 6, wall), B(10, -8, 26, 22, 6, wall), B(-40, -8, -34, 22, 6, wall2), B(34, -8, 40, 22, 6, wall2));
  // túnel do B com teto (dá pra andar por baixo)
  boxes.push(B(-34, 4, -26, 16, 0.4, wall2, 3.4));
  // portas do corredor longo e portas do meio
  boxes.push(...wallX(26, 34, 14, 1, 6, wall2, [door(28.5, 31.5, 3.2)]));
  boxes.push(...wallX(-10, 10, -12, 1, 6, wall2, [door(-2, 2, 3.2)]));
  // praça A elevada + rampas (do longo, da passarela, do CT)
  boxes.push(B(18, -34, 38, -14, 1.2, plat), R(26, -14, 34, -9, 0, 1.2, 'z', -1, plat), R(14, -32, 18, -25, 0, 1.2, 'x', 1, plat));
  boxes.push(B(10, -20, 18, -14, 1.2, plat), R(6, -20, 10, -14, 0, 1.2, 'x', 1, plat)); // passarela
  // praça B: plataforma do fundo + rampa
  boxes.push(B(-38, -34, -28, -26, 1.2, plat), R(-28, -34, -23, -26, 0, 1.2, 'x', -1, plat));
  boxes.push(...wallZ(-34, -18, -14, 1, 4, wall2, [door(-24, -20, 3)])); // muro entre B e CT com passagem
  // caixotes de cobertura
  const C = (x, z, s = 2, h = 2, c = crate, y0 = 0) => boxes.push(B(x - s / 2, z - s / 2, x + s / 2, z + s / 2, h, c, y0));
  C(26, -24, 2, 2, crate, 1.2); C(28, -24, 2, 2, crate2, 1.2); C(27, -24, 1.6, 1.4, crate, 3.2); C(32, -18, 2, 2, crate2, 1.2); C(22, -30, 2.4, 1.6, crate, 1.2); C(36, -30, 2, 3, crate2, 1.2);
  C(-30, -20, 2.4, 2, crate); C(-22, -28, 2, 2, crate2); C(-20, -18, 4, 1.4, '#a65a3a'); C(-32, -30, 2, 2, crate, 1.2);
  C(0, 4, 2, 2, crate); C(-6, 14, 2, 1.4, crate2); C(6, -4, 1.6, 1.6, crate);
  C(30, 2, 2, 2, crate); C(30, -4, 1.6, 1.2, crate2); C(-30, -2, 2, 2, crate); C(-30, 20, 1.6, 1.6, crate2);
  C(-8, 30, 2.2, 1.6, crate); C(8, 28, 2.2, 2, crate2); C(-24, 28, 3, 1.2, crate); C(24, 30, 2, 2, crate); C(0, -24, 3, 1.4, crate2); C(-8, -30, 2, 2, crate); C(8, -30, 2, 2, crate2);
  MAPS.push({
    id: 'duas-pocilgas', name: 'Duas Pocilgas', desc: 'Duas praças em disputa, corredor longo, portas no meio e passarela. Areia e caixotes.',
    size: [40, 36], wallH: 6, wallColor: [wall2, wall],
    palette: { sky: '#a9d6f5', fog: ['#ead9b6', 45, 120], hemi: ['#fff4e0', '#a58a5a', 1.5], sun: ['#fff0d0', 2.4], ground: sand, tiles: ['#e2c18a', '#d6b47a', 80, 20], clouds: true },
    boxes, props: [{ t: 'sign', x: 0, y: 4.6, z: -11.45, w: 5, h: 1.2, rot: 0, text: 'MEIO', bg: '#7a4a1c', fg: '#ffe7b0' },
      { t: 'sign', x: 30, y: 4.8, z: 14.55, w: 5, h: 1.2, rot: Math.PI, text: 'LONGO', bg: '#7a4a1c', fg: '#ffe7b0' },
      { t: 'sign', x: 28, y: 3.2, z: -33.9, w: 4, h: 2, rot: 0, text: 'A', bg: '#e63946', fg: '#fff' },
      { t: 'sign', x: -33, y: 3.2, z: -33.9, w: 4, h: 2, rot: 0, text: 'B', bg: '#e63946', fg: '#fff' },
      { t: 'keg', x: -18, z: -32 }, { t: 'keg', x: -16.8, z: -32 }, { t: 'keg', x: 16, z: 32 }],
    spawns: [[-8, 31], [0, 33], [8, 31], [-20, 31], [20, 31], [-6, -30], [0, -32], [6, -30], [-4, -20], [14, -28]],
    pickups: [['health', 0, 31], ['health', 0, -29], ['health', 30, 6], ['health', -30, 8],
      ['ammo', 30, -24, 1.2], ['ammo', -26, -24], ['ammo', 0, 0], ['ammo', -30, 20],
      ['grenade', 0, -18], ['grenade', 14, -17, 1.2], ['grenade', 30, 18], ['grenade', -20, -30]],
    showcase: [0, 0, 30], view: [3, 0, 25, 0.1, -0.03],
    test: { stairs: { from: [4.5, 0, -17], to: [14, 1.2, -17], level: 1.2 }, under: { from: [-30, 0, 1.5], to: [-30, 0, 18], ceil: 3.4 } },
  });
}

// ---------- 3) Celeiro Industrial (galpão de 2 andares + telhado + pátio com silos) ----------
{
  const barn = '#c0392b', barn2 = '#a93226', metal = '#7f8c8d', floor = '#b08a5a', roofC = '#5d6d7e', cont = ['#2e86c1', '#28b463', '#d68910', '#7DF9FF'], boxes = [];
  // paredes do galpão (portas no térreo)
  boxes.push(...wallX(-18, 18, -14.5, 1, 7, barn));
  boxes.push(...wallX(-18, 18, 14.5, 1, 7, barn, [door(-10, -6, 3.2), door(4, 8, 3.2)]));
  boxes.push(...wallZ(-14, 14, -18.5, 1, 7, barn2, [door(-2, 2, 3.2)]));
  boxes.push(...wallZ(-14, 14, 18.5, 1, 7, barn2, [door(4, 8, 3.2)]));
  // mezanino (2º andar interno) + rampa interna + guarda-corpo
  boxes.push(B(-18, -14, -4, 14, 0.3, floor, 3.2), R(-4, -13, 6, -9, 0, 3.5, 'x', -1, metal));
  boxes.push(B(-4.4, -9, -4, 14, 1.0, metal, 3.5));
  // telhado (metade oeste, com beiral ao norte) + rampa externa pro telhado
  boxes.push(B(-19, -21, 0, 15, 0.4, roofC, 7), R(0, -21, 12, -16, 0, 7.4, 'x', -1, metal));
  boxes.push(B(-18.5, -20.5, -17.5, -19.5, 7, metal), B(-1.5, -20.5, -0.5, -19.5, 7, metal));
  boxes.push(B(-19, -21.3, 0, -21, 0.8, metal, 7.4), B(-19.3, -21, -19, 15, 0.8, metal, 7.4)); // mureta do telhado
  // caixas dentro (embaixo do mezanino e no pátio interno)
  boxes.push(B(-14, 4, -11, 7, 1.6, '#9c6b3a'), B(-9, -6, -6, -3, 1.6, '#9c6b3a'), B(-15, -11, -12, -8, 1.2, '#b07a45'));
  boxes.push(B(4, -2, 10, 0.5, 2.6, cont[0]), B(10, 6, 14, 12, 2.6, cont[1]), B(2, 8, 5, 11, 1.4, '#9c6b3a'), B(13, -12, 17, -8, 2.6, cont[2]));
  boxes.push(B(-14, -13, -10, -12, 1.0, metal, 3.5), B(-16, 8, -13, 11, 1.4, '#9c6b3a', 3.5)); // cobertura no mezanino
  // pátio sul: contêineres empilhados
  boxes.push(B(-10, 22, -4, 24.5, 2.6, cont[1]), B(-9, 22, -5, 24.5, 2.6, cont[3], 2.6), B(6, 28, 12, 30.5, 2.6, cont[2]), B(-18, 32, -12, 34.5, 2.6, cont[0]));
  boxes.push(B(16, 34, 22, 36.5, 2.6, cont[1]), B(-30, 4, -27.5, 10, 2.6, cont[2]), B(27, -6, 29.5, 0, 2.6, cont[0]), B(-32, -30, -26, -27.5, 2.6, cont[3]));
  boxes.push(B(24, -32, 26.5, -26, 2.6, cont[1]), B(2, 36, 5, 39, 1.5, '#9c6b3a'), B(-24, 20, -21, 23, 1.5, '#b07a45'));
  MAPS.push({
    id: 'celeiro-industrial', name: 'Celeiro Industrial', desc: 'Galpão de dois andares com mezanino, telhado acessível por rampa e pátio com silos.',
    size: [40, 42], wallH: 7, wallColor: ['#8e9ea0', '#7f8c8d'],
    palette: { sky: '#b9d3e8', fog: ['#c8d4dc', 45, 130], hemi: ['#ffffff', '#7a7f70', 1.7], sun: ['#fff6e6', 2.0], ground: '#8f9a8a', tiles: ['#a3aaa0', '#9aa198', 84, 14], clouds: true },
    boxes, props: [{ t: 'silo', x: -28, z: 26, r: 4, h: 11, c: '#bdc3c7' }, { t: 'silo', x: 28, z: 24, r: 4, h: 12, c: '#d0d3d4' }, { t: 'silo', x: 32, z: -30, r: 3, h: 9, c: '#bdc3c7' },
      { t: 'truck', x: 14, z: 22, c: '#e63946' }, { t: 'sign', x: 0, y: 5.4, z: 15.05, w: 8, h: 2, rot: 0, text: 'CELEIRO C!', bg: '#7a1f17', fg: '#ffe7b0' },
      { t: 'hay', x: -32, z: 34 }, { t: 'hay', x: -34, z: 34 }, { t: 'hay', x: 34, z: 10 }],
    spawns: [[-10, 36], [10, 38], [30, 36], [-30, -34], [20, -34], [36, -12], [-12, -4, 3.5], [10, 3], [-34, 18], [0, -26]],
    pickups: [['health', -12, 10], ['health', -10, -6, 7.4], ['health', 0, 28], ['health', 32, -16],
      ['ammo', -14, 10, 3.5], ['ammo', 28, -30], ['ammo', -22, 36], ['ammo', 8, 4],
      ['grenade', 6, 4], ['grenade', -32, 0], ['grenade', 34, 20], ['grenade', -6, 10, 7.4], ['grenade', -8, -10, 3.5]],
    showcase: [2, 0, 34], view: [3, 0, 13, 0.75, 0.08],
    test: { stairs: { from: [7.5, 0, -11], to: [-8, 3.5, -11], level: 3.5 }, under: { from: [-16.5, 0, 11], to: [-16.5, 0, -11], ceil: 3.2 }, roof: { from: [12.5, 0, -18.5], to: [-6, 7.4, -18.5], level: 7.4 } },
  });
}

// ---------- 4) Mercadão (ruas de mercado, becos estreitos, sacadas e arcos) ----------
{
  const t1 = '#d9825b', t2 = '#e8a06a', t3 = '#c96f4a', t4 = '#f0c08a', stone = '#e6d3b3', rail = '#8b5a2b', boxes = [];
  boxes.push(B(-38, -34, -24, -12, 7, t1), B(-21, -26, -12, -12, 6, t2), B(12, -26, 26, -12, 6, t3), B(29, -34, 38, -12, 7, t4));
  boxes.push(B(-26, 12, -12, 26, 6, t3), B(-38, 12, -29, 34, 7, t2), B(12, 12, 26, 24, 3.3, t4), B(29, 12, 38, 34, 7, t1));
  // arcos sobre a rua principal
  boxes.push(...wallX(-9.5, 9.5, -18, 1, 6, stone, [door(-3, 3, 3.4)]), B(9.5, -18.5, 12, -17.5, 3, stone), B(-12, -18.5, -9.5, -17.5, 6, stone));
  boxes.push(...wallX(-9.5, 9.5, 18, 1, 6, stone, [door(-3, 3, 3.4)]), B(-12, 17.5, -9.5, 18.5, 3, stone), B(9.5, 17.5, 12, 18.5, 6, stone)); // a sacada passa por cima do arco
  // sacadas com rampa (escada) e guarda-corpo
  boxes.push(B(9.5, -24, 12, -14, 0.3, rail, 3), R(9.5, -14, 12, -4, 0, 3.3, 'z', -1, stone), B(9.5, -24, 9.9, -14, 1.0, rail, 3.3));
  boxes.push(B(-12, 14, -9.5, 24, 0.3, rail, 3), R(-12, 4, -9.5, 14, 0, 3.3, 'z', 1, stone), B(-9.9, 14, -9.5, 24, 1.0, rail, 3.3));
  // telhado baixo com mureta + rampa
  boxes.push(R(14, 24, 18, 32, 0, 3.3, 'z', -1, stone), B(12, 12, 26, 12.4, 0.9, t3, 3.3), B(12, 12.4, 12.4, 24, 0.9, t3, 3.3), B(22, 23.6, 26, 24, 0.9, t3, 3.3));
  // fonte central
  boxes.push(B(-2.5, -2.5, 2.5, 2.5, 0.8, stone), B(-0.5, -0.5, 0.5, 0.5, 2.4, stone));
  // vasos, caixotes e balcões
  for (const [x, z] of [[-32, -6], [32, 6], [-6, 30], [6, -30], [-17, -30], [20, 30]]) boxes.push(B(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 1.3, '#9c6b3a'));
  MAPS.push({
    id: 'mercadao', name: 'Mercadão', desc: 'Ruas de mercado com barracas, becos estreitos, sacadas, arcos e uma fonte no meio.',
    size: [38, 34], wallH: 7, wallColor: [t1, t3],
    palette: { sky: '#9fd0f0', fog: ['#f2d6b0', 45, 115], hemi: ['#fff1dc', '#b07a4a', 1.6], sun: ['#ffe2b8', 2.3], ground: '#e3c9a0', tiles: ['#e8cfa6', '#dcc094', 76, 38], clouds: true },
    boxes, props: [
      ...[[-6, -8, '#e63946'], [6, -8, '#7DF9FF'], [-6, 8, '#f2c94c'], [6, 8, '#e63946'], [-24, -4, '#7DF9FF'], [-24, 4, '#e63946'], [24, -4, '#f2c94c'], [24, 4, '#7DF9FF']].map(([x, z, c]) => ({ t: 'stall', x, z, c })),
      { t: 'water', x: 0, z: 0, r: 2.3, y: 0.82 }, { t: 'jar', x: -13, z: -9 }, { t: 'jar', x: 13, z: 9 }, { t: 'jar', x: -27.5, z: 30 },
      { t: 'awning', x0: 26, z0: -12, x1: 29, z1: -10, y: 3, c: '#e63946' },
      { t: 'sign', x: 0, y: 5, z: -17.45, w: 5, h: 1.1, rot: 0, text: 'MERCADÃO', bg: '#8b2f1c', fg: '#ffe7b0' },
      { t: 'sign', x: 0, y: 5, z: 17.45, w: 5, h: 1.1, rot: Math.PI, text: 'FEIRA C!', bg: '#8b2f1c', fg: '#ffe7b0' }],
    spawns: [[-32, 0], [32, 0], [0, -30], [0, 30], [-17, -31], [22, 30], [-32, -9], [32, 9], [-22.5, -18], [27.5, 18]],
    pickups: [['health', 0, -6], ['health', 0, 6], ['health', -30, -6], ['health', 30, 6],
      ['ammo', 10.7, -20, 3.3], ['ammo', -10.7, 20, 3.3], ['ammo', 20, 18, 3.3], ['ammo', -20, 0],
      ['grenade', -26, 0], ['grenade', 26, 0], ['grenade', 0, 26], ['grenade', 0, -26], ['grenade', -22.5, -18]],
    showcase: [0, 0, 28], view: [0, 0, 24, 0, 0.0],
    test: { stairs: { from: [10.7, 0, -2.5], to: [10.7, 3.3, -20], level: 3.3 }, under: { from: [0, 0, -12], to: [0, 0, -25], ceil: 3.4 } },
  });
}

// ---------- 5) Torres Gêmeas do Barril (campo aberto com duas bases-torre e ponte) ----------
{
  const red = '#e63946', red2 = '#c0303c', cyan = '#4fd8e8', cyan2 = '#2fb5c9', rock = '#8d8070', earth = '#a58b5f', floor = '#d9c7a0';
  const tower = (wc, wc2) => {
    const o = [];
    o.push(...wallX(-8, 8, 52.4, 0.8, 4, wc, [door(-2, 2, 4)]), ...wallX(-8, 8, 63.6, 0.8, 4, wc, [door(-2, 2, 4)]));
    o.push(...wallZ(52.8, 63.2, -7.6, 0.8, 4, wc2, [door(56, 60, 4)]), ...wallZ(52.8, 63.2, 7.6, 0.8, 4, wc2, [door(56, 60, 4)]));
    o.push(B(-8, 48, 8, 64, 0.4, floor, 4), B(8, 48, 12, 52, 0.4, floor, 4), R(8, 52, 12, 64, 0, 4.4, 'z', -1, wc2));
    o.push(B(-8, 48, -1.2, 48.4, 0.9, wc, 4.4), B(1.2, 48, 8, 48.4, 0.9, wc, 4.4)); // mureta da varanda
    o.push(R(-8, 50, -5, 62, 4.4, 8.4, 'z', 1, wc2), B(-5, 54, 5, 64, 0.4, floor, 8));
    o.push(B(-5, 54, -0.5, 54.4, 0.9, wc, 8.4), B(0.5, 54, 5, 54.4, 0.9, wc, 8.4), B(4.6, 54, 5, 64, 0.9, wc, 8.4)); // mureta do topo (fresta do sniper)
    o.push(B(-1, -1, 1, 1, 0, wc)); // (marcador)
    return o.filter((b) => b.b[4] > b.b[1]);
  };
  const boxes = [...tower(red, red2), ...mirrorZ(tower(cyan, cyan2))];
  // planaltos + ponte (dá pra passar por baixo)
  const mid = [B(-14, 10, 14, 22, 3, earth), R(-3, 22, 3, 31, 0, 3, 'z', -1, earth), R(14, 12, 22, 18, 0, 3, 'x', -1, earth)];
  boxes.push(...mid, ...mirrorZ(mid));
  boxes.push(B(-3, -10, 3, 10, 0.3, '#8b5a2b', 2.7), B(-3, -10, -2.7, 10, 0.8, '#6b4423', 3), B(2.7, -10, 3, 10, 0.8, '#6b4423', 3));
  // pedras de cobertura nas laterais
  for (const [x, z, s, h] of [[-22, 30, 3, 2], [22, 34, 2.5, 1.6], [-20, 6, 3, 2.2], [20, -6, 3, 2.2], [-24, -18, 2.5, 1.8], [24, 18, 2.5, 1.8], [-8, 40, 2, 1.4], [8, -40, 2, 1.4], [-18, -40, 3, 2], [18, 40, 3, 2]])
    boxes.push(B(x - s / 2, z - s / 2, x + s / 2, z + s / 2, h, rock), B(x - s / 2, -z - s / 2, x + s / 2, -z + s / 2, h, rock));
  const kegs = []; for (const [x, z] of [[-12, 46], [-11, 46], [-11.5, 47], [12, 44], [16, 50], [-16, 30], [16, 30]]) kegs.push({ t: 'keg', x, z }, { t: 'keg', x, z: -z });
  MAPS.push({
    id: 'torres-do-barril', name: 'Torres Gêmeas do Barril', desc: 'Campo aberto e comprido com duas bases-torre, ponte no meio e barris. Paraíso do sniper.',
    size: [30, 72], wallH: 5, wallColor: [rock, '#7a6e60'],
    palette: { sky: '#7ec8f2', fog: ['#b8e0f5', 70, 180], hemi: ['#ffffff', '#5a8f3a', 1.6], sun: ['#ffffff', 2.3], ground: '#6cbf4f', tiles: null, clouds: true },
    boxes: boxes.filter((b) => b.b[4] - b.b[1] > 0.05), props: [...kegs, { t: 'tree', x: -26, z: 0 }, { t: 'tree', x: 26, z: 4 }, { t: 'tree', x: -26, z: 50 }, { t: 'tree', x: 26, z: -50 },
      { t: 'banner', x: 0, y: 6.2, z: 47.9, c: red, rot: Math.PI }, { t: 'banner', x: 0, y: 6.2, z: -47.9, c: cyan, rot: 0 }],
    spawns: [[0, 58], [-4, 60, 4.4], [20, 60], [-20, 56], [0, -58], [4, -60, 4.4], [-20, -60], [20, -56], [-24, 0], [24, 0]],
    pickups: [['health', 0, 0], ['health', -22, 40], ['health', 22, -40], ['health', 0, 58], ['health', 0, -58],
      ['ammo', 4, 58, 4.4], ['ammo', -4, -58, 4.4], ['ammo', 0, 60, 8.4], ['ammo', 0, -60, 8.4], ['ammo', -24, -24], ['ammo', 24, 24],
      ['grenade', -24, 0], ['grenade', 24, 0], ['grenade', 0, 16, 3], ['grenade', 0, -16, 3]],
    waypoints: [[-4.2, 8.4, 61.6], [-4.2, 8.4, -61.6], [0, 8.4, 58], [0, 8.4, -58], [-6.5, 8.3, 61.7], [-6.5, 8.3, -61.7]],
    showcase: [22, 0, 36], view: [0, 4.4, 50, 0, -0.04],
    test: { stairs: { from: [10, 0, 63], to: [10, 4.4, 50], level: 4.4 }, under: { from: [-8, 0, 0.8], to: [8, 0, 0.8], ceil: 2.7 } },
  });
}

// ---------- 6) Vizinhança Cheers (beco sem saída com duas casas de 2 andares, ônibus e caminhão) ----------
{
  const boxes = [];
  boxes.push(...house(-18, -20, -4, -10, { wall: '#f2d16b', floor: '#c8a27a', roof: '#e63946', stair: '#b5793e', trim: '#ffffff' }));
  boxes.push(...rot180(house(4, 10, 18, 20, { wall: '#9be8f0', floor: '#c8a27a', roof: '#12233a', stair: '#b5793e', trim: '#ffffff' }), 11, 15));
  // cercas dos quintais
  for (const [a, b, c, d] of [[-26, -10, -20, -9.6], [20, 9.6, 26, 10], [-2, -24, -1.6, -18], [1.6, 18, 2, 24]]) boxes.push(B(a, b, c, d, 1.2, '#b5793e'));
  // carros e caixas de correio
  boxes.push(B(-15, 3, -10.5, 4.9, 1.5, '#2f80ed'), B(10.5, -4.9, 15, -3, 1.5, '#28b463'), B(-22, 4, -20, 6, 1, '#9c6b3a'), B(20, -6, 22, -4, 1, '#9c6b3a'));
  MAPS.push({
    id: 'vizinhanca-cheers', name: 'Vizinhança Cheers', desc: 'Pequeno e caótico: duas casas de dois andares frente a frente, ônibus e caminhão no meio da rua.',
    size: [26, 24], wallH: 3, wallColor: ['#b5793e', '#a0682f'],
    palette: DAY({ ground: '#7cc95a', tiles: null }),
    boxes, props: [{ t: 'street', x0: -26, z0: -8.5, x1: 26, z1: 8.5 }, { t: 'bus', x: -2, z: 0, c: '#f2c94c' }, { t: 'truck', x: 15, z: 3.5, c: '#e63946' },
      { t: 'tree', x: -22, z: -16 }, { t: 'tree', x: 22, z: 16 }, { t: 'tree', x: 22, z: -15 }, { t: 'tree', x: -22, z: 15 },
      { t: 'sign', x: -11, y: 4.8, z: -9.68, w: 3, h: 0.9, rot: 0, text: 'C! 1', bg: '#e63946', fg: '#fff' }, { t: 'sign', x: 11, y: 4.8, z: 9.68, w: 3, h: 0.9, rot: Math.PI, text: 'C! 2', bg: '#12233a', fg: '#7DF9FF' }],
    spawns: [[-23, -20], [23, 20], [-23, 9], [23, -9], [-11, -22.5], [11, 22.5], [-12, -13, 3.5], [12, 13, 3.5], [-2, -6], [2, 6]],
    pickups: [['health', -10, -12], ['health', 10, 12], ['ammo', -14, -12, 3.5], ['ammo', 14, 12, 3.5], ['ammo', -23, 0], ['ammo', 23, 0],
      ['grenade', 0, -6], ['grenade', 0, 6], ['grenade', -6, -12.5, 3.5], ['grenade', 6, 12.5, 3.5]],
    showcase: [8, 0, -5], view: [9, 0, 6, 0.64, 0.02],
    test: { stairs: { from: [-16.5, 0, -18.0], to: [-5.5, 3.5, -18.0], level: 3.5 }, under: { from: [-16, 0, -12.5], to: [-6, 0, -12.5], ceil: 3.2 } },
  });
}

// ---------- 7) Bar Cheers Noturno (bar compacto de noite, neon ciano, balcão, barris e mezanino) ----------
{
  const wood = '#5a3420', dark = '#2a2238', neon = '#7DF9FF', boxes = [];
  boxes.push(B(-7, -4, 7, -2.8, 1.2, wood), B(5.8, -4, 7, 2, 1.2, wood), B(-7, -4, -5.8, 0, 1.2, wood)); // balcão em U
  boxes.push(B(-14, -16, 14, -15, 2.2, '#3b2a1f')); // prateleiras no fundo (embaixo do mezanino)
  boxes.push(B(-20, -16, 20, -10, 0.3, '#4a2e1e', 3), R(-20, -10, -16, 2, 0, 3.3, 'z', -1, wood), R(16, -10, 20, 2, 0, 3.3, 'z', -1, wood));
  boxes.push(B(-16, -10.4, -1.5, -10, 1.0, '#1b1626', 3.3), B(1.5, -10.4, 16, -10, 1.0, '#1b1626', 3.3)); // guarda-corpo do mezanino
  boxes.push(B(-8, 10, 8, 16, 1.0, '#3a2a48'), R(8, 10, 11, 16, 0, 1, 'x', -1, '#3a2a48'), R(-11, 10, -8, 16, 0, 1, 'x', 1, '#3a2a48')); // palco
  boxes.push(B(-2, 13.5, 2, 15, 1.2, '#1b1626', 1), B(-6.5, 14, -5, 15.6, 2.4, '#111', 1), B(5, 14, 6.5, 15.6, 2.4, '#111', 1)); // DJ + caixas de som
  for (const [x, z] of [[-12, 0], [-12, 6], [12, 0], [12, 6], [-5, 5], [5, 5]]) boxes.push(B(x - 0.7, z - 0.7, x + 0.7, z + 0.7, 0.95, '#6b4423'));
  boxes.push(B(-3, -13.5, 3, -11.5, 0.9, '#1e7a4a')); // mesa de sinuca (embaixo do mezanino)
  const props = [];
  for (const [x, z] of [[-16, 6], [-15, 6], [-15.5, 7], [16, -4], [16, -5.1], [-3, -6], [-1.8, -6], [3, -6], [1.8, -6.2], [-10, -14], [10, -14]]) props.push({ t: 'keg', x, z });
  props.push({ t: 'keg', x: 6, z: -13, y: 3.3 }, { t: 'keg', x: -6, z: -13, y: 3.3 });
  props.push({ t: 'cup', x: -15, z: 12, s: 5 }, { t: 'cup', x: 15, z: 12, s: 5 }, { t: 'cup', x: 6, z: 7, s: 4 }, { t: 'cup', x: -3, z: -3.4, s: 0.6, y: 1.2, deco: true }, { t: 'cup', x: 2, z: -3.4, s: 0.6, y: 1.2, deco: true });
  props.push({ t: 'neon', x: 0, y: 5.2, z: -15.9, w: 10, h: 2.2, rot: 0, text: 'CHEERS', c: neon });
  props.push({ t: 'neon', x: -19.9, y: 4.2, z: 4, w: 4, h: 3, rot: Math.PI / 2, text: 'C!', c: '#ff5fa2' });
  props.push({ t: 'neon', x: 19.9, y: 4.2, z: 4, w: 5, h: 2, rot: -Math.PI / 2, text: 'BAR', c: neon });
  props.push({ t: 'neon', x: 0, y: 4.4, z: 15.9, w: 7, h: 1.6, rot: Math.PI, text: 'OINK!', c: '#ff5fa2' });
  props.push({ t: 'strip', x0: -7, z0: -2.78, x1: 7, z1: -2.78, y: 1.0, c: neon }, { t: 'strip', x0: -8, z0: 9.98, x1: 8, z1: 9.98, y: 0.9, c: '#ff5fa2' });
  MAPS.push({
    id: 'bar-cheers', name: 'Bar Cheers Noturno', desc: 'Bar compacto de noite: balcão, barris, copões vermelhos, palco, mezanino e neon ciano.',
    size: [20, 16], wallH: 6, wallColor: [dark, '#231c30'],
    palette: { sky: '#0b0e22', fog: ['#161236', 26, 80], hemi: ['#9a9aff', '#3a1c50', 1.6], sun: ['#b8c4ff', 1.1], ground: '#3a2418', tiles: ['#4a2e1e', '#3c2618', 40, 20], clouds: false, stars: true,
      lights: [[neon, 0, 4.5, -8, 40, 22], ['#ff5fa2', -14, 3.5, 8, 30, 18], [neon, 14, 3.5, 8, 30, 18], ['#ffd27a', 0, 3, 13, 25, 14]] },
    boxes, props,
    spawns: [[-17, 12], [17, 12], [-13, -6], [13, -6], [0, -13, 3.3], [-10, -12.5], [10, -12.5], [-12, 3], [12, 3], [0, 8]],
    pickups: [['health', 0, -7], ['health', -17, 14], ['ammo', -12, -13, 3.3], ['ammo', 12, -13, 3.3], ['ammo', 16, 14],
      ['grenade', 8, 2], ['grenade', -8, 2], ['grenade', 0, 12, 1]],
    showcase: [0, 0, 6], view: [-2, 1, 13, -0.08, -0.08],
    test: { stairs: { from: [-18, 0, 1.5], to: [-18, 3.3, -13], level: 3.3 }, under: { from: [-12, 0, -10.8], to: [8, 0, -10.8], ceil: 3 } },
  });
}

export const getMap = (id) => MAPS.find((m) => m.id === id) || MAPS[0];
