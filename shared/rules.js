// ============================================================
//  Regras compartilhadas (cliente + servidor). Sem DOM, sem Three.js.
//  Armas, Copo Bomba, física do Docão, tempos de partida e nomes dos bots.
// ============================================================
export const KILL_LIMIT = 20, TIME_LIMIT = 300, RESPAWN_TIME = 5, INVULN = 2;
// duração da partida escolhida pelo anfitrião (minutos); 0 = padrão do modo (5 min Mata-mata, 7 min Dominação)
export const TIME_OPTIONS = [0, 3, 5, 7, 10, 15, 20];
export const normTime = (v) => { const n = Number(v); return TIME_OPTIONS.includes(n) ? n : 0; };
// Regeneração fora de combate: 5 s sem levar dano → +10 de vida por segundo até 100.
// Só se o último dano veio de OUTRO Docão: dano em si mesmo (bazuca/foguete no pé, Copo Bomba próprio, míssil/nuke em si,
// atacante = você ou sem atacante) não libera e cancela a regeneração pendente. Pickup de vida e bacon não mexem nisso.
export const REGEN_DELAY = 5, REGEN_RATE = 10;
export function noteHurt(e, attacker, now) { e.lastHurt = now; e.regenOk = !!attacker && attacker !== e; }
export function resetRegen(e) { e.lastHurt = -1e9; e.regenOk = false; e.regenOn = false; }
export function regenStep(e, now, dt) {
  e.regenOn = !!(e.alive && e.regenOk && e.hp > 0 && e.hp < 100 && now - e.lastHurt >= REGEN_DELAY);
  if (e.regenOn) e.hp = Math.min(100, e.hp + REGEN_RATE * dt);
  return e.regenOn;
}
// Bacon que cura: quem pisa no bacon de um Docão morto (menos o próprio morto) ganha +10 de vida e o bacon some.
// life = tempo que o bacon fica visível no cliente (bacon.js: LINGER 3,0 + FADE 0,45 s); from = já virou bacon (MORPH 0,3 s).
// radius/dy: igual aos pickups de vida (raio horizontal ~1,2 m, mesmo andar).
export const BACON_ITEM = { heal: 10, radius: 1.2, dy: 1.0, from: 0.3, life: 3.45 };
export const GRAV = -24, JUMP = 8.5, SPEED = 6.8, BOT_SPEED = 5.4, STEP = 0.45, RADIUS = 0.42, HEIGHT = 2.0, EYE = 1.6;

// Armas. Primárias (menu): 0 Fuzil, 1 Calibre 12 (pump), 12 Semi, 2 Sniper Torresmo, 5 Canhão, 6 Carabina, 3 Bazuca. Faca 7, sabre 8. Secundária: 4 pistola, 11 furadeira, 13 besta, 14 arco. A besta e o arco são fracas de propósito: um tiro no corpo não mata.
export const WEAPONS = [
  { key: 'rifle', name: 'Fuzil Pururuca', short: 'Fuzil Pururuca', chip: 'Fuzil', mag: 30, reserve: 120, dmg: 20, headMul: 2, rate: 0.1, auto: true, pellets: 1, spread: 0.01, reload: 1.6, range: 140, recoil: 0.018, adsFov: 40, adsSpread: 0.12, flashZ: -0.76,
    desc: 'Automático · 30/120 · 20 dano' },
  { key: 'shotgun', name: 'Escopeta Chiqueiro · Calibre 12', short: 'Calibre 12', chip: 'Calibre 12', mag: 8, reserve: 32, dmg: 18, headMul: 1.5, rate: 0.8, auto: false, pellets: 8, spread: 0.06, reload: 0.45, shellReload: true, reloadStart: 0.25, range: 45, recoil: 0.07, adsFov: 55, adsSpread: 0.6, flashZ: -0.86,
    falloff: [7, 30, 0.3], pump: true, desc: 'Calibre 12 · pump · 8/32 · bem forte de perto' },
  // Intermediária: ferrolho clássico, 1 tiro no corpo (ref. Intervention).
  { key: 'sniper', name: 'Sniper Torresmo', short: 'Sniper Torresmo', chip: 'Torresmo', mag: 5, reserve: 20, dmg: 100, headMul: 1.5, rate: 1.15, auto: false, pellets: 1, spread: 0.07, reload: 2.3, range: 220, recoil: 0.055, adsFov: 13, adsSpread: 0, flashZ: -1.1,
    scope: true, bolt: true, beam: true, scopeStyle: 'torresmo', desc: 'Ferrolho médio · 5/20 · 1 tiro no corpo · botão direito = luneta' },
  { key: 'bazooka', name: 'Bazuca do Chiqueiro', short: 'Bazuca', chip: 'Bazuca', mag: 1, reserve: 4, dmg: 0, headMul: 1, rate: 0.6, auto: false, pellets: 0, spread: 0.004, reload: 2.5, range: 0, recoil: 0.09, adsFov: 55, adsSpread: 0.5, flashZ: -0.9,
    rocket: { speed: 24, radius: 5, maxDmg: 120, selfMul: 0.4, knock: 11, lift: 13 }, desc: 'Foguete · 1/4 · dano em área · rocket jump' },
  { key: 'pistol', name: 'Pistolinha Leitão', short: 'Pistolinha', chip: 'Pistola', mag: 12, reserve: 60, dmg: 25, headMul: 2, rate: 0.16, auto: false, pellets: 1, spread: 0.007, reload: 1.1, range: 110, recoil: 0.03, adsFov: 50, adsSpread: 0.4, flashZ: -0.42,
    desc: 'Semiautomática · 12/60 · 25 dano' },
  // Pesada: pouca bala, dano alto, luneta forte (ref. Barrett).
  { key: 'canhao', name: 'Canhão do Barril', short: 'Canhão do Barril', chip: 'Canhão', mag: 3, reserve: 6, dmg: 180, headMul: 1, rate: 1.85, auto: false, pellets: 1, spread: 0.045, reload: 3.1, range: 260, recoil: 0.1, adsFov: 8, adsSpread: 0, flashZ: -1.25,
    scope: true, bolt: true, beam: true, scopeStyle: 'canhao', desc: 'Ferrolho lento · 3/6 · mata em qualquer lugar · luneta pesada' },
  // Leve: ferrolho rápido, fraca no corpo (ref. M21).
  { key: 'carabina', name: 'Carabina da Granja', short: 'Carabina da Granja', chip: 'Carabina', mag: 10, reserve: 40, dmg: 55, headMul: 2.2, rate: 0.58, auto: false, pellets: 1, spread: 0.09, reload: 1.9, range: 180, recoil: 0.04, adsFov: 24, adsSpread: 0, flashZ: -0.95,
    scope: true, bolt: true, beam: true, scopeStyle: 'carabina', desc: 'Ferrolho rápido · 10/40 · fraca no corpo · luneta aberta' },
  // 7 · Faca de churrasqueiro: corpo a corpo, sempre no slot 3 (sem munição). Regras de acerto em shared/melee.js
  { key: 'knife', name: 'Faca de churrasqueiro', short: 'Faca', chip: 'Faca', mag: 0, reserve: 0, dmg: 40, headMul: 1, rate: 0.42, auto: true, pellets: 0, spread: 0, reload: 0, range: 1.6, recoil: 0, adsFov: 75, adsSpread: 1, flashZ: 0,
    melee: true, desc: 'Golpe 40 · estocada no botão direito · pelas costas mata' },
  // 8 · Sabre de Luz: corpo a corpo, no lugar da faca se você escolher. Um corte na frente mata.
  { key: 'sabre', name: 'Sabre de Luz', short: 'Sabre de Luz', chip: 'Sabre', mag: 0, reserve: 0, dmg: 100, headMul: 1, rate: 0.48, auto: false, pellets: 0, spread: 0, reload: 0, range: 2.5, recoil: 0, adsFov: 75, adsSpread: 1, flashZ: -0.5,
    melee: true, reach: 2.5, arc: 0.95,
    move: 0.7, desc: 'Corte na frente · 1 golpe · troca a faca · anda mais devagar' },
  // 9 · Mini uzi: rajada muito rápida, curta, abre de perto.
  { key: 'uzi', name: 'Mini Uzi do Leitão', short: 'Mini Uzi', chip: 'Uzi', mag: 25, reserve: 100, dmg: 11, headMul: 1.6, rate: 0.055, auto: true, pellets: 1, spread: 0.03, reload: 1.35, range: 70, recoil: 0.036, adsFov: 55, adsSpread: 0.5, flashZ: -0.52,
    falloff: [8, 28, 0.35], desc: 'Rajada rápida · 25/100 · forte de perto' },
  // 10 · Compacta no estilo P90: carregador grande em cima, rajada mais estável.
  { key: 'p90', name: 'P90 da Granja', short: 'P90', chip: 'P90', mag: 50, reserve: 150, dmg: 14, headMul: 1.5, rate: 0.07, auto: true, pellets: 1, spread: 0.016, reload: 1.7, range: 110, recoil: 0.024, adsFov: 48, adsSpread: 0.28, flashZ: -0.55,
    falloff: [16, 48, 0.45], desc: 'Compacta · 50/150 · rajada estável' },
  // 11 · Furadeira de prego: opção de secundária. Um prego por clique.
  { key: 'prego', name: 'Furadeira de Prego', short: 'Furadeira', chip: 'Prego', mag: 16, reserve: 64, dmg: 18, headMul: 1.4, rate: 0.11, auto: false, pellets: 1, spread: 0.02, reload: 1.25, range: 40, recoil: 0.02, adsFov: 58, adsSpread: 0.55, flashZ: -0.48,
    falloff: [6, 22, 0.25], desc: 'Secundária · um prego por clique · forte de perto' },
  // 12 · Escopeta semi: sem pump. Cada tiro é mais fraco que a Calibre 12, mas o próximo sai bem antes.
  { key: 'semi', name: 'Escopeta Semi do Leitão', short: 'Semi', chip: 'Semi', mag: 8, reserve: 32, dmg: 13, headMul: 1.5, rate: 0.36, auto: false, pellets: 8, spread: 0.075, reload: 1.4, range: 40, recoil: 0.048, adsFov: 58, adsSpread: 0.7, flashZ: -0.72,
    falloff: [6, 22, 0.25], desc: 'Semi · 8/32 · atira rápido · mais fraca que a pump' },
  // 13 · Besta: secundária de um virote. Não mata no corpo (vida 100).
  { key: 'besta', name: 'Besta do Leitão', short: 'Besta', chip: 'Besta', mag: 1, reserve: 10, dmg: 38, headMul: 1.35, rate: 0.45, auto: false, pellets: 1, spread: 0.004, reload: 1.35, range: 80, recoil: 0.045, adsFov: 58, adsSpread: 0.45, flashZ: -0.7,
    falloff: [12, 40, 0.45], desc: 'Secundária · um virote · recarrega armando a corda' },
  // 14 · Arco: secundária mais fraca, corda mais rápida que a besta.
  { key: 'arco', name: 'Arco da Granja', short: 'Arco', chip: 'Arco', mag: 1, reserve: 16, dmg: 26, headMul: 1.4, rate: 0.35, auto: false, pellets: 1, spread: 0.015, reload: 0.85, range: 65, recoil: 0.03, adsFov: 62, adsSpread: 0.55, flashZ: -0.55,
    falloff: [10, 36, 0.4], draw: 0.7, desc: 'Secundária · segura o clique para puxar a corda · solta mais forte' },
];
export const UZI = 9, P90 = 10, NAIL = 11, SEMI = 12;
export const CROSS = 13, BOW = 14;
export const PRIMARIES = [0, UZI, P90, 1, 2, 5, 6, 3, SEMI], PISTOL = 4, KNIFE = 7, SABER = 8, W_NADE = -1;
export const SECONDARIES = [PISTOL, NAIL, CROSS, BOW];
export const MELEES = [KNIFE, SABER];
export const BOT_PRIMARIES = [0, UZI, P90, 1, SEMI, 2, 5, 6, 3];
// Menu: cada grupo é uma escolha. primary = uma primária. melee = faca ou sabre. secondary = pistola, furadeira, besta ou arco.
export const CATEGORIES = [
  { id: 'rajada', title: 'Rajada', pick: 'primary', weapons: [0, UZI, P90] },
  { id: 'escopeta', title: 'Escopeta', pick: 'primary', weapons: [1, SEMI] },
  { id: 'precisao', title: 'Precisão', pick: 'primary', weapons: [2, 5, 6] },
  { id: 'explosivo', title: 'Explosivo', pick: 'primary', weapons: [3] },
  { id: 'faca', title: 'Faca', pick: 'melee', weapons: [KNIFE, SABER] },
  { id: 'secundaria', title: 'Secundária', pick: 'secondary', weapons: [PISTOL, NAIL, CROSS, BOW] },
];
// Faca: golpe (clique) e estocada (botão direito). range = alcance até a superfície do corpo; cone = meia-abertura (rad).
// Pelas costas (atacante atrás da vítima: cos(frente da vítima, vítima→atacante) < backDot) = morte instantânea.
export const MELEE = {
  slash: { dmg: 40, range: 1.6, cone: 0.62, rate: 0.42 },
  stab: { dmg: 75, range: 1.8, cone: 0.36, rate: 1.0 },
  backDot: -0.4, backDmg: 1000, speedMul: 1.15, draw: 0.2,
};
export const SABER_COLORS = [
  { id: 'vermelho', hex: '#ff2a2a' },
  { id: 'azul', hex: '#3d7eff' },
  { id: 'verde', hex: '#39e07a' },
  { id: 'roxo', hex: '#b44dff' },
  { id: 'amarelo', hex: '#ffe14a' },
  { id: 'branco', hex: '#f4fbff' },
];

// Copo Bomba (granada)
export const NADE = { max: 3, spawnWith: 1, fuse: 2.5, charge: 1.2, radius: 6, maxDmg: 130, selfMul: 0.4, grav: -20, r: 0.14, pickupRespawn: 20, knock: 14, lift: 7 };
export const WEAPON_SHORT = (i) => (i === W_NADE ? 'Copo Bomba' : WEAPONS[i] ? WEAPONS[i].short : '?');
export const BOT_DEFS = [
  { name: 'Farofa' }, { name: 'Pipoca' }, { name: 'Trufa' }, { name: 'Bolota' }, { name: 'Torresmo' }, { name: 'Paçoca' }, { name: 'Linguiça' }, { name: 'Quindim' }, { name: 'Coxinha' }, { name: 'Pururuca' },
];

export const BOT_RANGE = [14, 4.5, 26, 14, 10, 34, 18, 1.2, 2.2, 8, 12, 6, 6, 16, 14]; // 9 mini uzi perto, 10 P90 no meio, 11 furadeira perto, 12 semi perto, 13 besta, 14 arco
export const TAG_COLORS = ['#7DF9FF', '#ffd27a', '#ff9fb6', '#9be37a', '#c9a4ff', '#ffb36b', '#9fd0ff', '#ffa3d8', '#b8f2e6', '#ffe9a8'];
