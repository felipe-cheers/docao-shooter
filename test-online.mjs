// Teste do modo online: precisa do servidor local (cd server && npx wrangler dev --var ALLOW_TEST:1)
// e do site servido (python3 -m http.server 8124). Uso: node test-online.mjs [urlDoSite] [urlDoServidor]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787';
const SHOTS = process.env.SHOTS || 'screenshots'; mkdirSync(SHOTS, { recursive: true });
const errors = [], fails = []; const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + msg); if (!c) fails.push(msg); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function client(name, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] [${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] [pageerror] ${e.message} ${e.stack}`));
  await page.addInitScript((n) => { localStorage.setItem('docao.name', n); }, name);
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}${query}`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  return page;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(page, fn, ms = 8000, arg) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(100); } return false; }

// 0) colisão do servidor (shared/physics.js) idêntica à do cliente (world.js) em todos os mapas
const A = await client('Ana');
const same = await G(A, async () => {
  const { mapSolids } = await import('./shared/physics.js'); const g = window.__docao; const out = [];
  for (const m of g.MAPS) { g.loadMap(m.id); const c = g.solids.map((s) => [s.min.x, s.min.y, s.min.z, s.max.x, s.max.y, s.max.z, s.ramp ? s.ramp.axis + s.ramp.dir : ''].map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join()).sort();
    const sv = mapSolids(m).map((s) => [s.min.x, s.min.y, s.min.z, s.max.x, s.max.y, s.max.z, s.ramp ? s.ramp.axis + s.ramp.dir : ''].map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join()).sort();
    out.push([m.id, c.length, sv.length, c.join('|') === sv.join('|')]); }
  g.loadMap(g.MAPS[0].id); return out;
});
for (const [id, a, b, eq] of same) ok(eq, `colisão igual cliente/servidor em ${id} (${a}/${b} caixas)`);

// 1) menu online + criar sala
await A.evaluate(() => document.getElementById('onlineBtn').scrollIntoView({ block: 'center' })); await A.waitForTimeout(200);
await A.screenshot({ path: `${SHOTS}/15-online-menu.png` });
await A.click('#onlineBtn'); await A.waitForTimeout(300);
await A.selectOption('#roomMap', 'arena'); await A.selectOption('#roomMax', '4'); await A.selectOption('#roomBots', '0');
await A.screenshot({ path: `${SHOTS}/15-online-criar-sala.png` });
await A.click('#createBtn');
ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'Ana criou a sala e entrou');
const code = await G(A, () => window.__docao.online.code); console.log('código da sala:', code);
ok(/^[A-Z]{4}$/.test(code) && (await A.url()).includes('sala=' + code), 'código de 4 letras e link ?sala= na barra');
// 2) Beto entra pelo link, Caio digitando o código
const B = await client('Beto', `&sala=${code}`);
const C = await client('Caio');
await C.click('#onlineBtn'); await C.click('#tabJoin'); await C.fill('#joinCode', code.toLowerCase()); await C.click('#joinBtn');
for (const [p, n] of [[B, 'Beto (link)'], [C, 'Caio (código)']]) ok(await until(p, () => window.__docao.online && window.__docao.online.myId > 0), `${n} entrou na sala`);
ok(await until(A, () => document.querySelectorAll('#lobbyPlayers tr').length === 4), 'lobby da Ana lista 3 jogadores');
await A.waitForTimeout(2200); // pings
await A.screenshot({ path: `${SHOTS}/15-online-lobby.png` });
ok(await G(B, () => !document.getElementById('lobbyWait').classList.contains('hidden') && document.getElementById('hostCtl').classList.contains('hidden')), 'Beto (não anfitrião) vê "aguardando o anfitrião"');
// 3) começa a partida
await A.click('#startOnline');
for (const [p, n] of [[A, 'Ana'], [B, 'Beto'], [C, 'Caio']]) ok(await until(p, () => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive), `${n} está jogando e vivo`);
ok(await G(A, () => window.__docao.entities.length) === 3, 'Ana vê 3 Docões (sem bots)');
// teleporte de teste (o servidor só aceita com ALLOW_TEST=1)
const tp = (page, x, z, faceX, faceZ) => G(page, ([x, z, fx, fz]) => { const g = window.__docao, p = g.player, o = g.online; p.pos.set(x, g.groundAt(x, z, 0.3), z); p.vel.set(0, 0, 0);
  p.yaw = Math.atan2(-(fx - x), -(fz - z)); p.pitch = 0; o.net.send({ t: 'u', sq: p.sq, tp: 1, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon }); }, [x, z, faceX, faceZ]);
await tp(A, -30, -25, -22.5, -25); await tp(B, -22.5, -25, -30, -25); await tp(C, -30, -16, -30, -25);
await wait(800);
// Ana mira em Beto pela posição interpolada que ela vê
const aimAt = (page, name, dy = 1.1) => G(page, ([n, dy]) => { const g = window.__docao, p = g.player; const t = g.entities.find((e) => e.name === n); if (!t) return null;
  const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, h = t.pos.y + dy - (p.pos.y + 1.6); p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(h, Math.hypot(dx, dz)); return { d: Math.hypot(dx, dz).toFixed(1), vis: g.visible(t) }; }, [name, dy]);
console.log('Ana → Beto', await aimAt(A, 'Beto'));
const seen = await G(A, () => { const b = window.__docao.entities.find((e) => e.name === 'Beto'); return b && b.model.group.visible && b.pos.distanceTo(window.__docao.player.pos) < 12; });
ok(seen, 'Ana vê o boneco do Beto na posição dele');
await G(A, () => { window.__docao.player.invulnUntil = 0; }); await wait(1500); // proteção de renascimento (2 s) acaba
await A.screenshot({ path: `${SHOTS}/15-online-dois-jogadores.png` });
await B.screenshot({ path: `${SHOTS}/15-online-visao-do-beto.png` });
// 4) Ana atira até carimbar o Beto (fuzil 20 de dano)
const bHp0 = await G(B, () => window.__docao.player.hp);
await A.mouse.move(640, 360); await A.mouse.down();
const killed = await until(B, () => !window.__docao.player.alive, 6000);
await A.mouse.up();
ok(bHp0 === 100 && killed, 'Ana carimbou o Beto (dano/morte vindos do servidor)');
ok(await until(A, () => (window.__feedLog || []).some((l) => l.includes('Ana carimbou Beto')), 3000), 'kill feed da Ana mostra "Ana carimbou Beto"');
ok(await until(C, () => (window.__feedLog || []).some((l) => l.includes('Ana carimbou Beto')), 3000), 'kill feed do Caio também');
ok(await until(C, () => { const a = window.__docao.entities.find((e) => e.name === 'Ana'); return a && a.kills === 1; }, 3000), 'placar do Caio: Ana com 1 abate');
await A.screenshot({ path: `${SHOTS}/15-online-abate.png` });
ok(await until(B, () => window.__docao.player.alive, 6000), 'Beto renasceu (servidor)');
// 5) Copo Bomba: Caio joga na Ana
await G(A, () => { window.__docao.player.invulnUntil = 0; });
await tp(C, -30, -19.5, -30, -25); await wait(400);
console.log('Caio → Ana', await aimAt(C, 'Ana', -0.6));
const ex0 = await G(A, () => window.__docao.explosions), aHp0 = await G(A, () => window.__docao.player.hp);
await C.keyboard.down('KeyQ'); await wait(500); await C.keyboard.up('KeyQ');
ok(await until(A, () => window.__docao.grenades.length > 0, 2000), 'Ana vê o Copo Bomba do Caio voando');
ok(await until(A, (e0) => window.__docao.explosions > e0, 5000, ex0), 'explosão do Copo Bomba chegou na Ana');
const aHp1 = await G(A, () => window.__docao.player.hp);
console.log('vida da Ana antes/depois do Copo Bomba:', aHp0, aHp1);
ok(aHp1 < aHp0 || !(await G(A, () => window.__docao.player.alive)), 'Copo Bomba causou dano na Ana');
// 6) anti-cheat: teleporte sem permissão é desfeito
const back = await G(B, async () => { const g = window.__docao, p = g.player, o = g.online; const x0 = p.pos.x; p.pos.x += 20; o.net.send({ t: 'u', sq: p.sq, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon });
  await new Promise((r) => setTimeout(r, 600)); return Math.abs(p.pos.x - x0) < 1; });
ok(back, 'servidor recusou movimento de 20 m num pacote (posição corrigida)');
// 7) reconexão: derruba o socket do Caio
const cid = await G(C, () => window.__docao.online.myId);
await G(C, () => window.__docao.online.net.ws.close());
ok(await until(C, (id) => { const o = window.__docao.online; return o && o.net.open && o.myId === id; }, 8000, cid), 'Caio reconectou com o mesmo id');
ok(await until(C, () => window.__docao.player.alive && window.__docao.state === 'playing', 6000), 'Caio voltou pra partida');
ok(await until(A, () => window.__docao.entities.some((e) => e.name === 'Caio'), 4000), 'Ana ainda vê o Caio');
// 8) ping
const ping = await G(A, () => window.__docao.online.net.ping); ok(ping >= 0 && ping < 500, `ping medido (${ping} ms)`);
await G(A, () => document.getElementById('tabboard').classList.remove('hidden')); await wait(300);
await A.screenshot({ path: `${SHOTS}/15-online-placar.png` }); await G(A, () => document.getElementById('tabboard').classList.add('hidden'));
// 9) saída: Beto sai → some da Ana
await G(B, () => window.__docao.leaveOnline());
ok(await until(A, () => !window.__docao.entities.some((e) => e.name === 'Beto'), 4000), 'Beto saiu e sumiu da partida da Ana');
// 10) sala com bots do servidor + bazuca
for (const p of [A, B, C]) await p.context().close(); // SwiftShader: 4 abas 3D ao mesmo tempo engasgam a máquina de teste
const D = await client('Duda'); await G(D, () => { window.__docao.setPrimary(3); });
await D.click('#onlineBtn'); await D.selectOption('#roomMap', 'bar-cheers'); await D.selectOption('#roomMax', '4'); await D.selectOption('#roomBots', '1'); await D.click('#createBtn');
ok(await until(D, () => window.__docao.online && window.__docao.online.myId > 0), 'Duda criou sala com bots'); await D.click('#startOnline');
ok(await until(D, () => window.__docao.state === 'playing' && window.__docao.player.alive), 'Duda jogando');
ok(await until(D, () => window.__docao.entities.filter((e) => e.bot).length === 3, 3000), '3 bots do servidor completam a sala');
const p0 = await G(D, () => window.__docao.entities.filter((e) => e.bot).map((e) => e.pos.toArray()));
await wait(2500);
const p1 = await G(D, () => window.__docao.entities.filter((e) => e.bot).map((e) => e.pos.toArray()));
ok(p0.some((a, i) => Math.hypot(a[0] - p1[i][0], a[2] - p1[i][2]) > 1), 'bots andam (simulados no servidor)');
ok(await G(D, () => window.__docao.player.primary === 3 && window.__docao.player.weapon === 3), 'Duda com a Bazuca');
const e0 = await G(D, () => window.__docao.explosions);
await G(D, () => { const p = window.__docao.player; p.pitch = -1.2; }); // atira no chão a uns metros
await D.mouse.move(640, 360); await D.mouse.down(); await wait(120); await D.mouse.up();
ok(await until(D, (x) => window.__docao.explosions > x, 3000, e0), 'foguete da Bazuca explodiu (servidor)');
ok(await until(D, () => window.__docao.lastKnock > -99 || !window.__docao.player.alive, 2000), 'Duda levou o empurrão da explosão (rocket jump)'); // lastKnock fica em __docao (não no player)
await wait(6000);
const fight = await G(D, () => (window.__feedLog || []).length);
console.log('abates no kill feed da sala com bots após ~9 s:', fight);
await D.screenshot({ path: `${SHOTS}/15-online-bots.png` });
console.log('\nerros de console:', errors.length ? errors : 'nenhum');
if (errors.length) fails.push('erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
