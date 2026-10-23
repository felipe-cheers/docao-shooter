// node test-gunplay.mjs — regras de precisão, distribuição dos tiros e integração online.
import assert from 'node:assert/strict';
import test from 'node:test';
import { WEAPONS, SPEED } from './shared/rules.js';
import { CROUCH } from './shared/stance.js';
import { rayCapsule } from './shared/combat.js';
import { createGunplay, stepGunplay, shotSpread, kickShot, spreadDirection, botShotSpread } from './shared/gunplay.js';
import { Game } from './server/src/game.js';

const rifle = WEAPONS[0], snipers = WEAPONS.filter((w) => w.scope);
const still = () => createGunplay();
const stateAt = (w, speed, air = false) => {
  const s = still(); stepGunplay(s, w, speed, air, true, 0.3, 0.3); return s;
};
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
function seeded(seed = 42) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }; }

test('velocidade real: parado < agachado mirando < mirando < correndo < pulando', () => {
  for (const w of WEAPONS.filter((w) => w.pellets > 0 && !w.draw)) {
    const at = (speed, air = false) => shotSpread(w, stateAt(w, speed, air), 1, !!w.scope);
    const values = [at(0), at(SPEED * 0.6 * CROUCH.speed), at(SPEED * 0.6), at(SPEED), at(SPEED, true)];
    for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1], `${w.key}: ${values}`);
  }
  // Segurar ADS não elimina a penalidade de correr/pular.
  assert.ok(shotSpread(rifle, stateAt(rifle, SPEED), 1) > 0.04);
  assert.ok(shotSpread(rifle, stateAt(rifle, 0, true), 1) > 0.13);
});

test('parar/aterrissar recupera gradualmente; pular parado também perde precisão', () => {
  const s = stateAt(rifle, SPEED, true), airborne = shotSpread(rifle, s, 1);
  stepGunplay(s, rifle, 0, false, false, 0.05, 0.35);
  const landing = shotSpread(rifle, s, 1);
  assert.ok(landing > shotSpread(rifle, still(), 1) && landing < airborne);
  for (let t = 0.4; t <= 0.7; t += 0.05) stepGunplay(s, rifle, 0, false, false, 0.05, t);
  close(shotSpread(rifle, s, 1), shotSpread(rifle, still(), 1));
});

test('todas as snipers exigem luneta estabilizada; reabrir reinicia a estabilização', () => {
  for (const w of snipers) {
    const s = still();
    assert.ok(shotSpread(w, s, 0, false) >= 0.1);
    assert.ok(shotSpread(w, s, 1, true) >= 0.1);
    stepGunplay(s, w, 0, false, true, 0.02, 0.02);
    assert.ok(shotSpread(w, s, 1, true) > 0);
    stepGunplay(s, w, 0, false, true, 0.05, 0.07);
    close(shotSpread(w, s, 1, true), 0);
    stepGunplay(s, w, 0, false, false, 0.01, 0.08);
    assert.ok(shotSpread(w, s, 1, true) >= 0.1);
  }
});

test('no scope acerta bem perto e raramente à distância (10 mil tiros por distância)', () => {
  for (const w of snipers) {
    const random = seeded(), angle = shotSpread(w, still());
    const rateAt = (distance) => {
      let hits = 0;
      for (let i = 0; i < 10000; i++) {
        const d = spreadDirection({ x: 0, y: 0, z: -1 }, angle, random);
        if (rayCapsule({ x: 0, y: 1.1, z: 0 }, d, 100, { x: 0, y: 0, z: -distance }) !== null) hits++;
      }
      return hits / 10000;
    };
    assert.ok(rateAt(2) > 0.9, w.key);
    assert.ok(rateAt(25) < 0.12, w.key);
  }
});

test('cone tem o mesmo tamanho/distribuição em qualquer orientação, inclusive vertical', () => {
  for (const dir of [{ x: 0, y: 0, z: -1 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0.6, y: 0.8, z: 0 }]) {
    const random = seeded(); let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const d = spreadDirection(dir, 0.2, random), dot = d.x * dir.x + d.y * dir.y + d.z * dir.z;
      close(Math.hypot(d.x, d.y, d.z), 1);
      assert.ok(dot >= Math.cos(0.2) - 1e-12);
      sum += (1 - dot) / (1 - Math.cos(0.2));
    }
    close(sum / 10000, 0.5, 0.01);
  }
});

test('spray acumula recoil/dispersão com limite e volta na pausa; FPS não muda o retorno', () => {
  const s = still(), random = seeded(), first = shotSpread(rifle, s, 1);
  for (let i = 0; i < 40; i++) {
    stepGunplay(s, rifle, 0, false, false, rifle.rate, i * rifle.rate);
    const before = s.pitch;
    kickShot(s, rifle, i * rifle.rate, 1, random);
    assert.ok(s.pitch >= before && s.pitch <= 0.16);
  }
  assert.ok(shotSpread(rifle, s, 1) > first * 5);
  assert.ok(s.pitch > 0.1);
  const initial = { ...s };
  const results = [30, 60, 144].map((fps) => {
    const r = { ...initial };
    for (let i = 1; i <= fps; i++) stepGunplay(r, rifle, 0, false, false, 1 / fps, initial.lastShot + i / fps);
    close(r.pitch, 0); close(r.yaw, 0); close(shotSpread(rifle, r, 1), first);
    return r;
  });
  assert.equal(results[0].shots, 0);
});

test('retorno começa devagar, termina sem salto e mantém a mesma curva em diferentes FPS', () => {
  const initial = { ...still(), pitch: 0.16, yaw: -0.03, lastShot: 0 };
  const s = { ...initial };
  stepGunplay(s, rifle, 0, false, false, 0.13, 0.13);
  close(s.pitch, initial.pitch);
  stepGunplay(s, rifle, 0, false, false, 1 / 60, 0.13 + 1 / 60);
  assert.ok(s.pitch < initial.pitch && s.pitch > initial.pitch * 0.999, 'primeiro frame recupera menos de 0,1%, sem puxão');
  const sample = (fps, duration) => {
    const r = { ...initial }; let now = 0;
    while (now < duration) {
      const dt = Math.min(1 / fps, duration - now), previous = r.pitch; now += dt;
      stepGunplay(r, rifle, 0, false, false, dt, now);
      assert.ok(r.pitch >= 0 && r.pitch <= previous, 'retorno contínuo, sem oscilar ou passar do centro');
      assert.ok(r.yaw <= 0);
    }
    return r;
  };
  const middle = [30, 60, 144].map((fps) => sample(fps, 0.455));
  for (const r of middle) { close(r.pitch, initial.pitch / 2); close(r.yaw, initial.yaw / 2); }
  const end = sample(60, 0.77);
  assert.ok(end.pitch > 0 && end.pitch < 0.00001, 'já chega quase parado ao final');
  const finished = sample(60, 0.79);
  close(finished.pitch, 0); close(finished.yaw, 0);
});

test('SMGs toleram mais movimento; bots também perdem precisão ao correr e pular', () => {
  assert.ok(shotSpread(WEAPONS[10], stateAt(WEAPONS[10], SPEED), 1) < shotSpread(rifle, stateAt(rifle, SPEED), 1));
  const b = { vel: { x: 0, y: 0, z: 0 }, onGround: true };
  const a = botShotSpread(rifle, b, 0.06); b.vel.x = SPEED;
  const run = botShotSpread(rifle, b, 0.06); b.onGround = false;
  assert.ok(a < run && run < botShotSpread(rifle, b, 0.06));
});

test('servidor recebe a direção já dispersa do cliente sem aplicar dispersão duas vezes', () => {
  const g = new Game({ code: 'TEST', max: 2, fillBots: false }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  const e = g.join({ name: 'Ana', primary: 0 }).ent;
  g.startMatch('arena');
  e.connected = true; e.alive = true; e.slots = [0, 4, 7]; e.mag[0] = 30; e.reload = null;
  const dir = spreadDirection({ x: 0, y: 0, z: -1 }, 0.15, seeded());
  let received;
  g.hitscan = (_e, _o, dirs) => { received = dirs; };
  g.humanFire(e, [e.pos.x, e.pos.y + 1.6, e.pos.z], [[dir.x, dir.y, dir.z]], 0, g.T);
  assert.equal(received?.length, 1);
  close(received[0].x, dir.x); close(received[0].y, dir.y); close(received[0].z, dir.z);
  assert.equal(e.mag[0], 29);
});
