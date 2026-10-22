// ============================================================
//  Killstreaks online (servidor autoritativo). Mesmas regras/números do cliente offline (main.js: STREAK_LAP, PREDATOR, HELI).
//  Abates sem morrer: o ciclo dá 3 (Olho da granja, só no cliente), 5 (Míssil), 7 (Gavião) e volta depois do 10; cada 10 = nuke.
//  Abates do Gavião e do nuke não contam pra sequência.
// ============================================================
export const STREAK_LAP = 10;
export const streakCycle = (kills) => (kills <= 0 ? 0 : ((kills - 1) % STREAK_LAP) + 1);
// o que a sequência `kills` libera (pode ser mais de um: 10 não dá nada no ciclo, só o nuke)
export function streakRewards(kills) {
  const out = [], c = streakCycle(kills);
  if (c === 3) out.push('uav'); else if (c === 5) out.push('missile'); else if (c === 7) out.push('heli');
  if (kills > 0 && kills % STREAK_LAP === 0) out.push('nuke');
  return out;
}
export const PREDATOR = { radius: 26, maxDmg: 460, selfMul: 0.4, knock: 20, lift: 14, speed: 28, life: 16, height: 98, laptop: 0.7, back: 8 };
export const HELI = { hp: 280, life: 30, height: 17, hit: 3.1, dmg: 16, rate: 0.22, spin: 0.42, points: 25 };
export const NUKE = { delay: 5 };
// órbita do Gavião (sem o balanço visual): ângulo inicial + 0,42 rad/s ao redor do centro do mapa
export const heliOrbit = (size) => Math.min(18, Math.max(10, Math.min(size[0] || 24, size[1] || 24) * 0.42));
export function heliPos(h, T) { const a = h.ang + HELI.spin * (T - h.born); return { x: Math.cos(a) * h.orbit, y: HELI.height, z: Math.sin(a) * h.orbit }; }
// nome no kill feed (evento 'k', ev[8])
export const KS_KILL_NAME = { p: 'Míssil da granja', h: 'Gavião da granja', x: 'Fim da chapa' };
