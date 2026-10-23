// Sem GPU ou serviços externos: node test-damage-indicator.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createDamageIndicator } from './damage-indicator.js';
import { Game } from './server/src/game.js';

// Apenas a superfície SVG usada pelo indicador; as regras rodam no módulo real.
class SvgNode {
  children = []; style = {}; attrs = {};
  setAttribute(k, v) { this.attrs[k] = v; }
  appendChild(el) { el.remove(); this.children.push(el); el.parent = this; }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
}
globalThis.document = { createElementNS: () => new SvgNode() };
const zero = { x: 0, y: 0, z: 0 };
const point = (degrees) => ({ x: Math.sin(degrees * Math.PI / 180) * 10, y: 0, z: -Math.cos(degrees * Math.PI / 180) * 10 });
const rotation = (el) => Number(el.attrs.transform.slice(7, -1));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
function hud() { const root = new SvgNode(); return { root, indicator: createDamageIndicator(root) }; }

test('frente, direita, costas, esquerda e giro da câmera', () => {
  const { root, indicator: i } = hud();
  for (const angle of [0, 90, 180, -90]) {
    i.clear(); i.hit(point(angle), zero, 0); i.update(zero, 0, 0);
    near(rotation(root.children[0]), angle);
  }
  i.clear(); i.hit(point(-90), zero, 0); i.update(zero, Math.PI / 2, 0);
  near(rotation(root.children[0]), 0);
});

test('origem fica congelada; deslocar a vítima recalcula o ângulo', () => {
  const { root, indicator: i } = hud(), origin = point(0);
  i.hit(origin, zero, 0); origin.x = 99;
  i.update(zero, 0, 0); near(rotation(root.children[0]), 0);
  i.update({ x: 10, y: 0, z: 0 }, 0, 0); near(rotation(root.children[0]), -45);
});

test('golpes próximos renovam o arco, inclusive ao cruzar 180 graus', () => {
  const { root, indicator: i } = hud();
  i.hit(point(170), zero, 0); i.hit(point(-170), zero, 0.6);
  assert.equal(root.children.length, 1);
  i.update(zero, 0, 0.8); near(Number(root.children[0].style.opacity), 0.75);
  i.update(zero, 0, 1.41); assert.equal(root.children.length, 0);
});

test('limite de quatro arcos substitui o mais antigo e preserva os renovados', () => {
  const { root, indicator: i } = hud();
  for (const [n, angle] of [0, 60, 120, 180].entries()) i.hit(point(angle), zero, n * 0.01);
  i.hit(point(0), zero, 0.04); i.hit(point(-60), zero, 0.05); i.update(zero, 0, 0.05);
  assert.equal(root.children.length, 4);
  const angles = root.children.map(rotation);
  assert.ok(angles.some((a) => Math.abs(a) < 1e-6));
  assert.ok(!angles.some((a) => Math.abs(a - 60) < 1e-6));
});

test('expiração, limpeza e fontes ausentes, inválidas ou na vertical', () => {
  const { root, indicator: i } = hud();
  for (const origin of [null, undefined, {}, [NaN, 0, 2], [0, 0], { x: 0, y: 10, z: 0 }]) i.hit(origin, zero, 0);
  assert.equal(root.children.length, 0);
  i.hit([10, 0, 0], zero, 0); i.update(zero, 0, 0.4);
  near(Number(root.children[0].style.opacity), 0.5);
  i.update(zero, 0, 0.8); assert.equal(root.children.length, 0);
  i.hit(point(0), zero, 1); i.clear(); assert.equal(root.children.length, 0);
});

function room(mode = 'dm') {
  const g = new Game({ code: 'TEST', mode, fillBots: false }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  const a = g.makeEnt({ name: 'Atacante' }), t = g.makeEnt({ name: 'Vítima' });
  for (const e of [a, t]) { e.alive = true; e.invulnUntil = 0; }
  a.pos = { x: 12, y: 0, z: 3 }; g.P = { losClear: () => true };
  return { g, a, t };
}

test('servidor preserva dano, headshot e flags de parede e congela a origem', () => {
  const { g, a, t } = room();
  g.damage(t, 10, a, 0, true, false, null, 3);
  const ev = g.events.find((e) => e[0] === 'h');
  assert.deepEqual(ev, ['h', t.id, a.id, 90, 1, 10, 3, [12, 0, 3]]);
  a.pos.x = 99; assert.equal(ev[7][0], 12);
});

test('explosão própria aponta para a explosão; névoa e dano sem fonte não inventam direção', () => {
  const { g, t } = room();
  const c = { x: 2, y: 1, z: 0 };
  g.blast(c, t, { radius: 8, maxDmg: 10, selfMul: 0.4, knock: 0, lift: 0, wIdx: 0, kind: 'n' });
  assert.deepEqual(g.events.find((e) => e[0] === 'h')[7], [2, 1, 0]);
  g.events.length = 0; g.damage(t, 1, null, 0, false);
  assert.equal(g.events[0][7], null);
  g.events.length = 0; g.damage(t, 1, { fog: true, id: 0, pos: c }, 0, false);
  assert.equal(g.events[0][7], null);
});

test('invulnerabilidade e fogo amigo bloqueado não emitem evento de dano', () => {
  const { g, a, t } = room('dom');
  t.invulnUntil = 10; g.damage(t, 10, a, 0, false);
  assert.equal(g.events.length, 0);
  t.invulnUntil = 0; a.team = t.team = 0; g.damage(t, 10, a, 0, false);
  assert.equal(g.events.length, 0); assert.equal(t.hp, 100);
});

test('Gavião usa a posição do helicóptero em vez do dono', (test) => {
  test.mock.method(Math, 'random', () => 0.99);
  const { g, a, t } = room();
  const h = { id: 1, alive: true, owner: a, until: 10, cool: 0, born: 0, ang: 0, orbit: 15 };
  g.helis = [h];
  g.stepHelis(0.05);
  const ev = g.events.find((e) => e[0] === 'h');
  assert.ok(ev); assert.deepEqual(ev[7], Object.values(g.heliAt(h)));
  assert.notEqual(ev[7][0], a.pos.x);
});

// Executa os handlers reais, isolando renderização/áudio para verificar a integração.
const main = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
function client() {
  const { root, indicator } = hud();
  const player = { id: 1, isPlayer: true, alive: true, hp: 100, pos: { ...zero }, invulnUntil: 0 };
  const attacker = { id: 2, pos: point(90) };
  const ctx = { player, state: 'playing', gameTime: 0, online: { myId: 1 }, NET_SHOOTER: {}, INV_EVENTS: new Set(),
    entOf: (id) => id === 1 ? player : id === 2 ? attacker : null,
    damageIndicator: indicator, hurtFlash() {}, sfx: { oink() {} },
    friends: () => false, invMode: () => false, noteHurt() {}, kill() {},
  };
  const show = main.slice(main.indexOf('function showDamageDirection('), main.indexOf('function flashMsg(', main.indexOf('function showDamageDirection(')));
  const net = main.slice(main.indexOf('function netEvent(ev)'), main.indexOf('function personalEvent(ev)'));
  const damage = main.slice(main.indexOf('function damage('), main.indexOf('function kill('));
  runInNewContext(show + net + damage + '\nthis.hit = netEvent; this.hurt = damage;', ctx);
  return { root, indicator, ctx, player, attacker };
}

test('cliente online aceita origem nova, flags antigas e eventos sem flags', () => {
  const { root, indicator: i, ctx, attacker } = client();
  ctx.hit(['h', 1, 2, 90, 0, 10, 3, [0, 0, -10]]);
  i.update(zero, 0, 0); near(rotation(root.children[0]), 0);
  i.clear(); ctx.hit(['h', 1, 2, 80, 0, 10, 1]);
  i.update(zero, 0, 0); near(rotation(root.children[0]), 90);
  i.clear(); ctx.hit(['h', 1, 2, 70, 0]);
  i.update(zero, 0, 0); near(rotation(root.children[0]), 90);
  i.clear(); ctx.hit(['h', 1, 2, 60, 0, 10, 0, null]);
  assert.equal(root.children.length, 0);
  attacker.pos.x = NaN; ctx.hit(['h', 1, 2, 50, 0, 10]);
  assert.equal(root.children.length, 0);
});

test('cliente offline mostra dano real e ignora pausa, morto e invulnerabilidade', () => {
  const { root, indicator: i, ctx, player, attacker } = client();
  ctx.hurt(player, 10, attacker, 0, false); assert.equal(root.children.length, 1);
  i.clear(); ctx.state = 'paused'; ctx.hurt(player, 10, attacker, 0, false);
  assert.equal(root.children.length, 0);
  ctx.state = 'playing'; player.invulnUntil = 1; ctx.hurt(player, 10, attacker, 0, false);
  assert.equal(root.children.length, 0);
  player.invulnUntil = 0; player.alive = false; ctx.hurt(player, 10, attacker, 0, false);
  assert.equal(root.children.length, 0);
});
