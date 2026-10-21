// ============================================================
//  Combate compartilhado (offline + servidor). Sem DOM, sem Three.js.
//  • Corpo do Docão como cápsula vertical (equivale às esferas de acerto: pés ~0,02 m, topo 2,08 m, raio 0,58).
//  • Explosões (Bazuca e Copo Bomba): distância do centro da explosão ao PONTO MAIS PRÓXIMO da cápsula (não ao centro);
//    linha de visão testada de 2 origens para 4 pontos do corpo (pés, peito, cabeça, ponto mais próximo) — basta um livre.
//    Dano = maxDmg × (0,2 + 0,8 × (1 − d/raio)); o raio é o mesmo do efeito visual (o anel de choque termina no raio).
//  • Foguete colide com a cápsula (com a folga do próprio foguete), então acerto direto sempre conta (d = 0 → dano máximo).
//  • Sniper: dispersão zero com luneta e parado/quase parado; pequena andando ou sem luneta.
// ============================================================
export const BODY = { y0: 0.6, y1: 1.5, r: 0.58 };
export const ROCKET_PAD = 0.15;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function bodyClosest(c, pos) {
  const ax = pos.x, ay = clamp(c.y, pos.y + BODY.y0, pos.y + BODY.y1), az = pos.z;
  const dx = c.x - ax, dy = c.y - ay, dz = c.z - az, L = Math.hypot(dx, dy, dz);
  if (L <= BODY.r) return { d: 0, point: { x: c.x, y: c.y, z: c.z } };
  const k = BODY.r / L; return { d: L - BODY.r, point: { x: ax + dx * k, y: ay + dy * k, z: az + dz * k } };
}
// alvos de uma explosão: [{ e, d, k, dmg, knock:{x,y,z} }]; losClear(a, b) = linha livre entre pontos
// direct = entidade em que o foguete bateu (contato com o casco): conta como distância 0, dano máximo
export function explosionHits(c, o, ents, losClear, owner, teamMode, direct = null) {
  const out = []; const srcs = [{ x: c.x, y: c.y + 0.15, z: c.z }, { x: c.x, y: c.y + 0.9, z: c.z }];
  for (const e of ents) {
    if (!e.alive) continue;
    if (teamMode && owner && e !== owner && e.team === owner.team) continue; // sem fogo amigo (dano em si mesmo continua)
    const bc = bodyClosest(c, e.pos), point = bc.point, d = e === direct ? 0 : bc.d; if (d > o.radius) continue;
    const pts = [point, { x: e.pos.x, y: e.pos.y + 0.3, z: e.pos.z }, { x: e.pos.x, y: e.pos.y + 1.0, z: e.pos.z }, { x: e.pos.x, y: e.pos.y + 1.7, z: e.pos.z }];
    let seen = d < 0.35; for (const s of srcs) { if (seen) break; for (const p of pts) if (losClear(s, p)) { seen = true; break; } }
    if (!seen) continue;
    const k = 1 - d / o.radius;
    let hx = e.pos.x - c.x, hz = e.pos.z - c.z; const L = Math.hypot(hx, hz); if (L < 1e-2) { hx = Math.random() - 0.5; hz = Math.random() - 0.5; }
    const n = Math.hypot(hx, hz) || 1;
    out.push({ e, d, k, dmg: o.maxDmg * (0.2 + 0.8 * k) * (e === owner ? o.selfMul : 1), knock: { x: hx / n * o.knock * k, y: o.lift * k, z: hz / n * o.knock * k } });
  }
  return out;
}
// raio × cápsula vertical em pos (com folga pad). Devolve t ≥ 0 do primeiro contato ou null.
export function rayCapsule(o, d, maxT, pos, pad = 0) {
  const R = BODY.r + pad, y0 = pos.y + BODY.y0, y1 = pos.y + BODY.y1; let best = null;
  const take = (t) => { if (t >= 0 && t <= maxT && (best === null || t < best)) best = t; };
  const ox = o.x - pos.x, oz = o.z - pos.z, A = d.x * d.x + d.z * d.z, B = 2 * (ox * d.x + oz * d.z), C = ox * ox + oz * oz - R * R;
  if (C <= 0 && o.y >= y0 && o.y <= y1) return 0; // começou dentro
  if (A > 1e-9) { const disc = B * B - 4 * A * C; if (disc >= 0) { const t = (-B - Math.sqrt(disc)) / (2 * A); const y = o.y + d.y * t; if (y >= y0 && y <= y1) take(t); } }
  for (const cy of [y0, y1]) { // tampas esféricas
    const px = ox, py = o.y - cy, pz = oz, b = px * d.x + py * d.y + pz * d.z, cc = px * px + py * py + pz * pz - R * R, h = b * b - cc;
    if (cc <= 0) return 0; if (h >= 0) take(-b - Math.sqrt(h));
  }
  return best;
}
// dispersão do Sniper: scoped = luneta aberta (o overlay aparece), speed = velocidade horizontal, air = no ar
export function sniperSpread(scoped, speed, air) {
  if (scoped) return air ? 0.02 : speed < 1.5 ? 0 : 0.012;
  return air ? 0.06 : speed < 1.5 ? 0.025 : 0.045;
}
