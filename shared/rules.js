// ============================================================
//  Regras compartilhadas (cliente + servidor). Sem DOM, sem Three.js.
//  Armas, Copo Bomba, física do Docão, tempos de partida e nomes dos bots.
// ============================================================
export const KILL_LIMIT = 20, TIME_LIMIT = 300, RESPAWN_TIME = 5, INVULN = 2;
export const GRAV = -24, JUMP = 8.5, SPEED = 6.8, BOT_SPEED = 5.4, STEP = 0.45, RADIUS = 0.42, HEIGHT = 2.0, EYE = 1.6;

// Armas. Primárias (menu): 0 Fuzil, 1 Calibre 12, 2 Sniper Torresmo, 5 Canhão, 6 Carabina, 3 Bazuca. Secundária: 4 Pistolinha.
export const WEAPONS = [
  { key: 'rifle', name: 'Fuzil Pururuca', short: 'Fuzil Pururuca', chip: 'Fuzil', mag: 30, reserve: 120, dmg: 20, headMul: 2, rate: 0.1, auto: true, pellets: 1, spread: 0.01, reload: 1.6, range: 140, recoil: 0.018, adsFov: 40, adsSpread: 0.12, flashZ: -0.76,
    desc: 'Automático · 30/120 · 20 dano' },
  { key: 'shotgun', name: 'Escopeta Chiqueiro · Calibre 12', short: 'Calibre 12', chip: 'Calibre 12', mag: 8, reserve: 32, dmg: 15, headMul: 1.5, rate: 0.8, auto: false, pellets: 8, spread: 0.06, reload: 0.45, shellReload: true, reloadStart: 0.25, range: 45, recoil: 0.07, adsFov: 55, adsSpread: 0.6, flashZ: -0.86,
    falloff: [7, 30, 0.3], pump: true, desc: 'Calibre 12 · pump · 8/32 · forte de perto' },
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
    melee: true, desc: 'Sempre equipada · golpe 40 · estocada 75 (botão direito) · pelas costas mata' },
];
export const PRIMARIES = [0, 1, 2, 5, 6, 3], PISTOL = 4, KNIFE = 7, W_NADE = -1;
// Faca: golpe (clique) e estocada (botão direito). range = alcance até a superfície do corpo; cone = meia-abertura (rad).
// Pelas costas (atacante atrás da vítima: cos(frente da vítima, vítima→atacante) < backDot) = morte instantânea.
export const MELEE = {
  slash: { dmg: 40, range: 1.6, cone: 0.62, rate: 0.42 },
  stab: { dmg: 75, range: 1.8, cone: 0.36, rate: 1.0 },
  backDot: -0.4, backDmg: 1000, speedMul: 1.15, draw: 0.2,
};

// Copo Bomba (granada)
export const NADE = { max: 3, spawnWith: 1, fuse: 2.5, charge: 1.2, radius: 6, maxDmg: 130, selfMul: 0.4, grav: -20, r: 0.14, pickupRespawn: 20, knock: 14, lift: 7 };
export const WEAPON_SHORT = (i) => (i === W_NADE ? 'Copo Bomba' : WEAPONS[i] ? WEAPONS[i].short : '?');
export const BOT_DEFS = [
  { name: 'Farofa' }, { name: 'Pipoca' }, { name: 'Trufa' }, { name: 'Bolota' }, { name: 'Torresmo' }, { name: 'Paçoca' }, { name: 'Linguiça' }, { name: 'Quindim' }, { name: 'Coxinha' }, { name: 'Pururuca' },
];

export const BOT_RANGE = [14, 4.5, 26, 14, 10, 34, 18, 1.2]; // distância preferida dos bots por arma (7 = faca)
export const TAG_COLORS = ['#7DF9FF', '#ffd27a', '#ff9fb6', '#9be37a', '#c9a4ff', '#ffb36b', '#9fd0ff', '#ffa3d8', '#b8f2e6', '#ffe9a8'];
