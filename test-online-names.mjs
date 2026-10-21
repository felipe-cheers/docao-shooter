// Teste online: nome do jogador (campo no menu/janela online/lobby, salvo no navegador, limpo e sem repetir no servidor).
// Uso: node test-online-names.mjs [urlDoSite] [urlDoServidor]   (servidor local com --var ALLOW_TEST:1)
import { chromium } from 'playwright';
import { cleanName } from './shared/names.js';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787';
const SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + msg); if (!c) fails.push(msg); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function client(tag, stored, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${tag}] [${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] [pageerror] ${e.message}`));
  if (stored) await page.addInitScript((n) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('docao.name', n); sessionStorage.setItem('seeded', '1'); } }, stored);
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}${query}`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  return page;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(page, fn, ms = 8000, arg) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(100); } return false; }
const lobbyNames = (p) => G(p, () => (window.__docao.online.lobby?.players || []).filter((x) => !x.bot).map((x) => x.name));

// 1) Ana: sem nome salvo, digita na janela online (o menu e o lobby acompanham)
const A = await client('A', null);
ok(await G(A, () => document.getElementById('nameInput').value === 'Docão'), 'padrão "Docão" no menu');
await A.click('#onlineBtn'); await A.fill('#onlineName', '  Matheus  '); await A.press('#onlineName', 'Tab');
ok(await G(A, () => localStorage.getItem('docao.name') === 'Matheus' && document.getElementById('nameInput').value === 'Matheus'), 'nome da janela online salvo e copiado pro menu');
await A.selectOption('#roomMap', 'arena'); await A.selectOption('#roomMax', '4'); await A.selectOption('#roomBots', '0');
await A.click('#createBtn');
ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'Ana (Matheus) criou a sala');
const code = await G(A, () => window.__docao.online.code);
ok(await G(A, () => document.getElementById('lobbyName').value === 'Matheus'), 'campo de nome no lobby com o nome salvo');
// 2) B entra pelo link com o MESMO nome salvo → servidor devolve "Matheus (2)"
const B = await client('B', 'matheus', `&sala=${code}`);
ok(await until(B, () => window.__docao.online && window.__docao.online.myId > 0 && window.__docao.online.lobby, 20000), 'B entrou pelo link');
ok(await until(A, () => (window.__docao.online.lobby?.players || []).filter((x) => !x.bot).length === 2), 'lobby com 2 jogadores');
let names = await lobbyNames(A); console.log('lobby:', names);
ok(names.includes('Matheus') && names.includes('matheus (2)'), 'nome repetido vira "matheus (2)"');
ok(await until(B, () => document.getElementById('lobbyNameMsg').textContent.includes('matheus (2)'), 5000), 'B é avisado de como aparece na sala');
// 3) B troca o nome no lobby: comprido, com espaços, tags e caracteres invisíveis → limpo e cortado em 16
// 3a) servidor: mesmo mandando direto (sem o limite do campo), limpa e corta em 16
const longRaw = '  Beto\u200b <b>Zé</b>   da Silva Sauro Junior ', longWant = cleanName(longRaw);
await G(B, (n) => window.__docao.online.net.send({ t: 'prof', name: n }), longRaw);
ok(await until(A, (w) => (window.__docao.online.lobby?.players || []).some((x) => x.name === w), 5000, longWant) && Array.from(longWant).length === 16, `servidor limpa e corta nome enviado direto ("${longWant}")`);
// 3b) pelo campo do lobby (o campo já limita a 16)
const raw = ' Beto\u200b <i>Zé</i>';
const want = cleanName(raw); console.log('esperado:', JSON.stringify(want));
await B.fill('#lobbyName', raw); await B.click('#lobbyNameBtn');
ok(await until(A, (w) => (window.__docao.online.lobby?.players || []).some((x) => x.name === w), 5000, want), `servidor usa o nome limpo (${want}, ${Array.from(want).length} caracteres)`);
ok(await G(B, (w) => localStorage.getItem('docao.name') === w && document.getElementById('nameInput').value === w, want), 'nome novo salvo no navegador do B');
ok(await G(A, () => !document.getElementById('lobbyPlayers').innerHTML.includes('<b>Zé')), 'sem HTML injetado na lista do lobby');
await A.waitForTimeout(800); await A.screenshot({ path: `${SHOTS}/20-nome-lobby.png` });
// 4) partida: plaquinha, placar e kill feed com os nomes certos dos dois lados
await A.click('#startOnline');
for (const p of [A, B]) ok(await until(p, () => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive), 'jogando');
ok(await G(A, (w) => { const e = window.__docao.entities.find((x) => !x.isPlayer); return e && e.name === w && !!e.tagSprite; }, want), 'A vê o boneco do B com o nome dele');
ok(await G(B, (w) => { const e = window.__docao.entities.find((x) => !x.isPlayer); return e && e.name === 'Matheus' && window.__docao.player.name === w; }, want), 'B vê "Matheus" e ele mesmo com o nome novo');
const lbHas = (p, n) => G(p, (n) => document.getElementById('lb').textContent.includes(n), n);
await wait(600);
ok((await lbHas(A, want)) && (await lbHas(A, 'Matheus')) && (await lbHas(B, want)) && (await lbHas(B, 'Matheus')), 'placar do canto com os dois nomes nos dois clientes');
const tp = (page, x, z, fx, fz) => G(page, ([x, z, fx, fz]) => { const g = window.__docao, p = g.player, o = g.online; p.pos.set(x, g.groundAt(x, z, 0.3), z); p.vel.set(0, 0, 0);
  p.yaw = Math.atan2(-(fx - x), -(fz - z)); p.pitch = 0; o.net.send({ t: 'u', sq: p.sq, tp: 1, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon }); }, [x, z, fx, fz]);
await tp(A, -30, -25, -22.5, -25); await tp(B, -22.5, -25, -30, -25); await wait(800);
await G(A, () => { const g = window.__docao, p = g.player, t = g.entities.find((e) => !e.isPlayer); const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, h = t.pos.y + 1.1 - (p.pos.y + 1.6); p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(h, Math.hypot(dx, dz)); p.invulnUntil = 0; });
await wait(1600); await A.screenshot({ path: `${SHOTS}/20-nome-plaquinha.png` });
let killed = false;
for (let i = 0; i < 6 && !killed; i++) { // re-mira e atira em rajadas (proteção de renascimento pode durar um pouco)
  await G(A, () => { const g = window.__docao, p = g.player, t = g.entities.find((e) => !e.isPlayer); const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, h = t.pos.y + 1.1 - (p.pos.y + 1.6); p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(h, Math.hypot(dx, dz)); });
  await A.mouse.move(640, 360); await A.mouse.down(); killed = await until(B, () => !window.__docao.player.alive, 2500); await A.mouse.up();
}
ok(killed, 'A carimbou o B');
const line = `Matheus carimbou ${want}`;
ok(await until(A, (l) => (window.__feedLog || []).some((x) => x.includes(l)), 3000, line), `kill feed do A: "${line}"`);
ok(await until(B, (l) => (window.__feedLog || []).some((x) => x.includes(l)), 3000, line), 'kill feed do B igual');
await G(B, () => document.getElementById('tabboard').classList.remove('hidden')); await wait(300);
ok(await G(B, (w) => { const t = document.getElementById('tabboard').textContent; return t.includes('Matheus') && t.includes(w); }, want), 'placar (Tab) com os dois nomes');
await B.screenshot({ path: `${SHOTS}/20-nome-placar.png` });
console.log('\nerros de console:', errors.length ? errors : 'nenhum');
if (errors.length) fails.push('erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
