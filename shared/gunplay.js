// Precisão e recoil: ângulos em radianos, tempos em segundos. Sem DOM/Three.js.
// Agachar melhora a precisão pela velocidade REAL menor; não há bônus duplicado de postura.
import { SPEED } from './rules.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const RIFLE = { move: 0.045, air: 0.14, bloom: 0.018, kick: 0.75, cap: 0.16, side: 0.25, delay: 0.13, recover: 10 };
const SMG = { ...RIFLE, move: 0.028, air: 0.11, bloom: 0.022, kick: 0.48, cap: 0.14 };
const SHOTGUN = { ...RIFLE, move: 0.02, air: 0.09, bloom: 0, cap: 0.12, recover: 9 };
const SNIPER = { ...RIFLE, move: 0.055, air: 0.22, bloom: 0, kick: 0.4, cap: 0.1, side: 0.08, hip: 0.13, settle: 0.05 };
export const GUNPLAY = {
  rifle: RIFLE,
  famas: { ...RIFLE, bloom: 0.014, side: 0.12 },
  lmg: { ...RIFLE, move: 0.055, air: 0.16, bloom: 0.026, cap: 0.18 },
  uzi: SMG, p90: { ...SMG, bloom: 0.016, kick: 0.6 },
  pistol: { ...RIFLE, move: 0.035, air: 0.12, bloom: 0.012, cap: 0.12, recover: 12 },
  prego: { ...SMG, bloom: 0.014 }, shotgun: SHOTGUN, semi: SHOTGUN,
  sniper: SNIPER,
  canhao: { ...SNIPER, hip: 0.15, move: 0.065, settle: 0.06 },
  carabina: { ...SNIPER, hip: 0.105, move: 0.045, settle: 0.04 },
  minigun: { ...RIFLE, move: 0.05, air: 0.18, bloom: 0.02, kick: 0.7, cap: 0.1 },
};
const profile = (w) => GUNPLAY[w.key] || RIFLE;
export const movementError = (speed) => clamp((speed - 0.15) / (SPEED - 0.15)) ** 1.5;
export const createGunplay = () => ({ pitch: 0, yaw: 0, heat: 0, shots: 0, lastShot: -Infinity, move: 0, air: 0, scopeTime: 0 });

export function stepGunplay(s, w, speed, air, fullyScoped, dt, now) {
  const p = profile(w);
  s.move = Math.max(movementError(speed), s.move - dt / 0.16);
  s.air = air ? 1 : Math.max(0, s.air - dt / 0.25);
  s.scopeTime = fullyScoped ? s.scopeTime + dt : 0;
  // Só recupera na pausa; integra apenas o trecho do frame posterior ao atraso.
  const idleDt = Math.min(dt, Math.max(0, now - s.lastShot - p.delay));
  const decay = Math.exp(-idleDt * p.recover);
  s.pitch *= decay; s.yaw *= decay;
  if (Math.abs(s.pitch) < 0.0001) s.pitch = 0;
  if (Math.abs(s.yaw) < 0.0001) s.yaw = 0;
  s.heat = Math.max(0, s.heat - idleDt * 32);
  if (!s.heat) s.shots = 0;
}

export function shotSpread(w, s, ads = 0, scoped = false) {
  const p = profile(w);
  const motion = p.move * s.move + p.air * s.air;
  if (w.scope) {
    const settle = scoped ? clamp(s.scopeTime / p.settle) : 0;
    return p.hip * (1 - settle) + motion;
  }
  const base = w.spread * (1 - (1 - w.adsSpread) * clamp(ads));
  return base + motion + p.bloom * clamp((s.heat - 2) / 10);
}

export function kickShot(s, w, now, ads = 0, random = Math.random) {
  const p = profile(w);
  const k = w.recoil * p.kick * (1 - 0.15 * ads) * (1 + 0.35 * clamp(s.heat / 12));
  const lateral = [0, 0.15, -0.1, 0.3, 0.6, 0.8, 0.45, -0.2, -0.65, -0.8, -0.5, 0.1];
  s.pitch = Math.min(p.cap, s.pitch + k * (0.9 + random() * 0.2));
  s.yaw = clamp(s.yaw + k * p.side * (lateral[s.shots % lateral.length] + (random() - 0.5) * 0.2), -0.045, 0.045);
  s.heat = Math.min(12, s.heat + 1); s.shots++; s.lastShot = now;
}

// Cone uniforme em ângulo sólido, independente de para onde o jogador está olhando.
export function spreadDirection(dir, angle, random = Math.random) {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const x = dir.x / len, y = dir.y / len, z = dir.z / len;
  if (!angle) return { x, y, z };
  const h = Math.hypot(x, z), ux = h > 1e-6 ? z / h : 1, uz = h > 1e-6 ? -x / h : 0;
  const vx = y * uz, vy = z * ux - x * uz, vz = -y * ux;
  const c = 1 - random() * (1 - Math.cos(angle)), r = Math.sqrt(Math.max(0, 1 - c * c)), a = random() * Math.PI * 2;
  const u = r * Math.cos(a), v = r * Math.sin(a);
  return { x: x * c + ux * u + vx * v, y: y * c + vy * v, z: z * c + uz * u + vz * v };
}

// Bots mantêm seu erro de pontaria, somado à penalidade da própria movimentação.
export function botShotSpread(w, b, aimError) {
  const p = profile(w);
  return aimError + p.move * movementError(Math.hypot(b.vel.x, b.vel.z)) + ((!b.onGround || b.vel.y > 0.1) ? p.air : 0);
}
