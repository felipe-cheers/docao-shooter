// Fumaça, atordoamento, UAV, mísseis e nuke. Uso: SITE=http://localhost:8123/ node test-streaks.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForTimeout(1500);
const G = (fn, a) => page.evaluate(fn, a);
const until = async (fn, ms = 12000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn)) return true;
    await page.waitForTimeout(100);
  }
  return false;
};
await G(() => {
  const g = window.__docao;
  g.startGame('arena');
  for (const e of g.entities) {
    e.invulnUntil = g.time + 9999;
    if (!e.isPlayer) e.frozen = true;
  }
});
await page.waitForTimeout(400);
await G(() => { window.__docao.player.smokeNades = 1; window.__docao.throwSmoke(); });
ok(await until(() => window.__docao.smokes.length > 0), 'a fumaça estoura');
const smoke = await G(() => {
  const g = window.__docao;
  const s = g.smokes[0];
  if (!s) return { n: 0 };
  const bot = g.entities.find((e) => !e.isPlayer && e.alive);
  bot.pos.set(s.pos.x, 0, s.pos.z + 3);
  g.player.pos.set(s.pos.x, 0, s.pos.z - 8);
  g.player.vel.set(0, 0, 0);
  bot.vel.set(0, 0, 0);
  if (bot.model) bot.model.group.position.copy(bot.pos);
  const blocked = s.blocks(
    { x: s.pos.x, y: s.pos.y, z: s.pos.z - 8 },
    { x: s.pos.x, y: s.pos.y, z: s.pos.z + 3 },
  );
  return { n: g.smokes.length, blocked, left: g.player.smokeNades };
});
ok(smoke.n === 1 && smoke.blocked && smoke.left === 0, `fumaça abre e tampa a linha (${JSON.stringify(smoke)})`);
ok(await until(() => {
  const bot = window.__docao.entities.find((e) => !e.isPlayer && e.alive);
  return !!(bot && bot.model && bot.model.group.visible === false);
}), 'inimigo some atrás da fumaça');

await G(() => { window.__docao.player.stunNades = 1; window.__docao.player.pos.set(0, 0, 0); window.__docao.throwStun(); });
ok(await until(() => {
  const g = window.__docao;
  const n = g.tacticals[0];
  if (n) g.player.pos.copy(n.pos);
  return g.player.stunUntil > g.time;
}), 'o atordoamento chega');
const stun = await G(() => {
  const p = window.__docao.player;
  const flash = document.getElementById('stunFlash');
  return { until: p.stunUntil > window.__docao.time, op: flash ? flash.style.opacity : '0', left: p.stunNades };
});
ok(stun.until && parseFloat(stun.op) > 0.5 && stun.left === 0, `atordoamento pega quem está perto (${JSON.stringify(stun)})`);

await G(() => { window.__docao.rewardKill(); window.__docao.rewardKill(); window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const uav = await G(() => ({
  n: document.querySelector('#streakCount b')?.textContent,
  shown: !document.getElementById('streakCount').hidden,
  uav: !document.getElementById('uav').hidden,
  time: document.getElementById('uavTime')?.textContent,
}));
ok(uav.n === '3' && uav.shown && uav.uav && uav.time === '10s', `3 abates ligam o minimapa (${JSON.stringify(uav)})`);
await G(() => {
  const g = window.__docao;
  g.player.pos.set(0, 0, 0);
  g.player.yaw = 0;
  let i = 0;
  for (const e of g.entities) {
    if (e.isPlayer) continue;
    e.pos.set(i === 0 ? 0 : 90, 0, i === 0 ? -6 : 90);
    i++;
  }
});
await page.waitForTimeout(250);
const aim = await page.evaluate(() => {
  const c = document.querySelector('#uav canvas');
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height, cx = w / 2, cy = h / 2;
  const red = (x, y) => { const d = ctx.getImageData(x | 0, y | 0, 1, 1).data; return d[0] > 180 && d[0] > d[1] + 40 && d[0] > d[2] + 40; };
  let above = 0, below = 0;
  for (let y = cy * 0.35; y < cy - 10; y += 3) for (let x = cx - 24; x < cx + 24; x += 3) if (red(x, y)) above++;
  for (let y = cy + 10; y < cy + (h - cy) * 0.65; y += 3) for (let x = cx - 24; x < cx + 24; x += 3) if (red(x, y)) below++;
  const card = (n) => document.querySelector(`#streakBar .streak-card[data-need="${n}"]`).getBoundingClientRect().top;
  return { above, below, low: card('3'), high: card('7'), left: document.querySelector('#streakBar .streak-card[data-need="3"] b').textContent };
});
ok(aim.above > 0 && aim.above > aim.below, `inimigo na frente fica em cima no minimapa (${JSON.stringify(aim)})`);
ok(aim.high < aim.low && aim.left === '0', `barra de baixo pra cima, o de 3 já foi (${JSON.stringify(aim)})`);

await G(() => { window.__docao.rewardKill(); window.__docao.rewardKill(); });
await page.waitForTimeout(300);
const mapOpen = await G(() => !document.getElementById('strikeMap').hidden);
ok(mapOpen, '5 abates abrem o mapa dos mísseis');
const before = await G(() => window.__docao.explosions);
const box = await page.locator('#strikeMap canvas').boundingBox();
ok(!!box, 'mapa dos mísseis tem área clicável');
if (box) {
  for (const k of [0.3, 0.55, 0.75]) await page.mouse.click(box.x + box.width * k, box.y + box.height * 0.5);
}
await page.evaluate((n) => { window.__needBoom = n; }, before + 3);
ok(await until(() => window.__docao.explosions >= window.__needBoom, 8000), 'os mísseis saem');
const boom = await G(() => window.__docao.explosions);
ok(boom >= before + 3, `três mísseis estouram (${before} → ${boom})`);

await G(() => { window.__docao.rewardKill(); window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const nukeOn = await G(() => {
  const b = document.getElementById('nukeBanner');
  const ready = document.getElementById('nukeReady');
  return { hidden: !b || b.hidden, ready: ready && !ready.hidden, kills: window.__docao.rewardKills, bots: window.__docao.entities.filter((e) => !e.isPlayer && e.alive).length };
});
ok(nukeOn.hidden && nukeOn.ready && nukeOn.kills === 7 && nukeOn.bots > 0, `7 abates deixam o rádio pronto, sem estourar ainda (${JSON.stringify(nukeOn)})`);
await G(() => window.__docao.callNuke());
await page.waitForTimeout(200);
const counting = await G(() => document.getElementById('nukeBanner')?.querySelector('b')?.textContent);
ok(counting === '5', `apertar o rádio começa a contagem (${counting})`);
ok(await until(() => window.__docao.entities.filter((e) => !e.isPlayer && e.alive).length === 0, 15000), 'a contagem do nuke acaba');
const after = await G(() => ({
  bots: window.__docao.entities.filter((e) => !e.isPlayer && e.alive).length,
  me: window.__docao.player.alive,
  kills: window.__docao.rewardKills,
}));
ok(after.bots === 0 && after.me && after.kills === 7, `nuke mata todo mundo menos você, sem reciclar o contador (${JSON.stringify(after)})`);

await G(() => window.__docao.rewardKill());
const mid = await G(() => {
  const card = document.querySelector('#streakBar .streak-card[data-need="3"]');
  return { n: document.querySelector('#streakCount b')?.textContent, card: card?.className || '' };
});
ok(mid.n === '8' && mid.card.includes('next'), `depois do 7 o ciclo recomeça (${JSON.stringify(mid)})`);
await G(() => { window.__docao.rewardKill(); window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const again = await G(() => ({
  n: document.querySelector('#streakCount b')?.textContent,
  uav: !document.getElementById('uav').hidden,
  card: document.querySelector('#streakBar .streak-card[data-need="3"]')?.className || '',
}));
ok(again.n === '10' && again.uav && again.card.includes('earned'), `o prêmio de 3 volta no próximo ciclo (${JSON.stringify(again)})`);

await G(() => window.__docao.kill(window.__docao.player));
await page.waitForTimeout(200);
const dead = await G(() => document.getElementById('streakCount').hidden);
ok(dead, 'morrer zera o número de seguidos');

if (errors.length) console.log('erros:', errors.slice(0, 8).join('\n'));
ok(errors.length === 0, 'sem erro no console');
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
