// Dominação online (servidor autoritativo). Precisa de: cd server && npx wrangler dev --var ALLOW_TEST:1  +  python3 -m http.server 8124
// Uso: node test-online-dom.mjs [urlDoSite] [urlDoServidor]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function client(name, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] [${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] [pageerror] ${e.message} ${e.stack}`));
  await page.addInitScript((n) => { localStorage.setItem('docao.name', n); localStorage.setItem('docao.primary', '0'); }, name);
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}${query}`, { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(1500); return page;
}
const G = (p, fn, a) => p.evaluate(fn, a); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(p, fn, ms = 8000, a) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, a)) return true; await wait(100); } return false; }
const tp = (page, x, z, y) => G(page, ([x, z, y]) => { const g = window.__docao, p = g.player, o = g.online; p.pos.set(x, y ?? g.groundAt(x, z, 0.3), z); p.vel.set(0, 0, 0);
  o.net.send({ t: 'u', sq: p.sq, tp: 1, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon }); }, [x, z, y]);
const zoneOf = (p) => G(p, () => { const z = window.__docao.zone; return z && { x: z.x, y: z.y, z: z.z, p: z.progress, t: z.team, c: z.contested }; });
const toZone = (p, dx = 0) => zoneOf(p).then((z) => tp(p, z.x + dx, z.z, z.y));
// 1) sala Dominação, sem bots
const A = await client('Ana');
await A.click('#onlineBtn'); await A.selectOption('#roomMap', 'arena'); await A.selectOption('#roomMax', '6'); await A.selectOption('#roomBots', '0'); await A.selectOption('#roomMode', 'dom');
await A.click('#createBtn'); ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'Ana criou sala de Dominação');
const code = await G(A, () => window.__docao.online.code);
ok(await until(A, () => document.getElementById('lobbyMode').textContent.includes('Domina') || (document.getElementById('lobbyMode').value === 'dom')), 'lobby mostra o modo Dominação');
const B = await client('Beto', `&sala=${code}`), C = await client('Caio', `&sala=${code}`);
for (const p of [B, C]) await until(p, () => window.__docao.online && window.__docao.online.myId > 0);
// 2) escolha de time no lobby + regra de desequilíbrio
await A.click('#lobbyTeamBtns .teambtn.t0'); await until(A, () => document.querySelector('#lobbyTeamBtns .teambtn.t0.active'), 5000);
let anyBlocked = false; const known = { Ana: 0 };
for (const [p, n] of [[B, 'Beto'], [C, 'Caio']]) {
  await until(p, (k) => { const o = window.__docao.online; return Object.entries(k).every(([nm, t]) => o.lobby.players.some((q) => q.name === nm && q.team === t)); }, 6000, known);
  const c = await G(p, () => { const o = window.__docao.online, c = [0, 0]; for (const q of o.lobby.players) if (!q.bot && q.id !== o.myId && q.team >= 0) c[q.team]++; return c; });
  const expectBlock = c[0] - c[1] >= 1;
  await G(p, () => { document.getElementById('lobbyTeamErr').textContent = ''; window.__lastTeamOk = null; const ws = window.__docao.online.net.ws; ws.addEventListener('message', (e) => { if (e.data.includes('teamOk')) window.__lastTeamOk = JSON.parse(e.data); }); });
  await p.click('#lobbyTeamBtns .teambtn.t0'); await until(p, () => !!window.__lastTeamOk, 5000);
  const r = await G(p, () => ({ ok: window.__lastTeamOk, err: document.getElementById('lobbyTeamErr').textContent }));
  ok(r.ok && r.ok.blocked === expectBlock && (expectBlock ? r.err.length > 0 && r.ok.team === 1 : !r.err && r.ok.team === 0), `${n} pediu Vermelho com ${c[0]}×${c[1]} → ${expectBlock ? 'bloqueado, foi pro Azul e avisado' : 'aceito'} ${r.err ? '("' + r.err + '")' : ''}`);
  anyBlocked ||= !!(r.ok && r.ok.blocked); if (r.ok) known[n] = r.ok.team;
}
ok(anyBlocked, 'com os 3 pedindo Vermelho, a regra de desequilíbrio bloqueou alguém');
await wait(800); await A.screenshot({ path: `${SHOTS}/17-online-lobby-times.png` });
await A.click('#startOnline');
for (const p of [A, B, C]) await until(p, () => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive, 10000);
const teams = await G(A, () => Object.fromEntries(window.__docao.entities.map((e) => [e.name, e.team])));
console.log('times (visão da Ana):', JSON.stringify(teams));
const [MATE, FOE] = teams.Beto === 0 ? ['Beto', 'Caio'] : ['Caio', 'Beto']; const M = MATE === 'Beto' ? B : C, F = FOE === 'Beto' ? B : C;
ok(teams.Ana === 0 && teams[MATE] === 0 && teams[FOE] === 1, `times do servidor: Ana+${MATE} Vermelho, ${FOE} Azul (2×1)`);
ok(await G(F, () => window.__docao.mode === 'dom' && window.__docao.player.team === 1 && !!window.__docao.zone), `${FOE}: modo Dominação, time Azul, zona recebida`);
ok(await G(A, () => { const r = document.getElementById('lb').getBoundingClientRect(); return r.left < 40 && r.top < 40 && document.querySelectorAll('#lb .row').length === 3 && !!document.querySelector('#lb .row.me'); }), 'placar online no canto superior esquerdo (3 linhas, você destacado)');
// 3) sem fogo amigo: Ana atira no Caio
await tp(A, -30, -30); await tp(M, -22, -30); await tp(F, 30, 30); await wait(2600);
const aim = (p, n) => G(p, (n) => { const g = window.__docao, p = g.player, t = g.entities.find((e) => e.name === n); const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, h = t.pos.y + 1.1 - (p.pos.y + 1.6); p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(h, Math.hypot(dx, dz)); }, n);
await aim(A, MATE); await A.mouse.move(640, 360); await A.click('#game'); await wait(200); await aim(A, MATE); await A.mouse.down(); await wait(1500); await A.mouse.up();
ok(await G(M, () => window.__docao.player.hp === 100 && window.__docao.player.alive), `Ana atirou no ${MATE} (mesmo time): nenhum dano`);
// 4) captura: 1 vs 2 jogadores, contestada
const z0 = await zoneOf(A); console.log('zona:', JSON.stringify(z0));
await tp(M, -30, 30); await toZone(A); await wait(400);
const rate = async (ms) => { const a = await zoneOf(F), t0 = Date.now(); await wait(ms); const b = await zoneOf(F); return { r: (b.p - a.p) / ((Date.now() - t0) / 1000), a, b }; };
const r1 = await rate(2000); await toZone(M, 1); await wait(300); const r2 = await rate(2000);
console.log('progresso/s 1 e 2 (visto pelo inimigo):', r1.r.toFixed(3), r2.r.toFixed(3));
ok(r1.r > 0.08 && r2.r > r1.r * 1.6, `servidor: captura mais rápida com 2 do que com 1 (${(r2.r / r1.r).toFixed(2)}×)`);
await toZone(F, -1); await wait(500); const rc = await rate(1500);
ok(Math.abs(rc.r) < 0.01 && rc.b.c, `${FOE} entrou: contestada, progresso parado (${rc.r.toFixed(4)}/s)`);
await A.screenshot({ path: `${SHOTS}/17-online-zona-contestada.png` });
await tp(F, 30, 30); await F.context().close(); await M.context().close(); // SwiftShader: poucas abas 3D ao mesmo tempo
// 5) entrada no meio da partida: escolhe o time antes de nascer
const D = await client('Duda', `&sala=${code}`);
ok(await until(D, () => window.__docao.state === 'playing' && !document.getElementById('teamPick').classList.contains('hidden'), 25000), 'Duda entrou no meio: aparece "Escolha seu time" antes de nascer');
await D.screenshot({ path: `${SHOTS}/17-online-escolha-time-meio.png` });
ok(await G(D, () => !window.__docao.player || !window.__docao.player.alive), 'Duda não nasce antes de escolher');
await D.click('#teamPickBtns .teambtn.t0'); await until(D, () => document.getElementById('teamPickErr').textContent.length > 0 || window.__docao.player.alive, 5000);
ok(await until(D, () => window.__docao.player && window.__docao.player.team === 1, 6000), `Duda pediu Vermelho (2×0) no meio da partida → bloqueado, foi pro Azul`);
ok(await until(D, () => window.__docao.player && window.__docao.player.alive && window.__docao.player.team === 1, 8000), 'Duda nasceu no Azul');
ok(await until(A, () => document.querySelectorAll('#lb .row').length >= 2 && [...document.querySelectorAll('#lb .row')].some((r) => r.textContent.includes('Duda')), 6000), `Duda aparece no placar da Ana (${await G(A, () => document.getElementById('lb').innerText.replace(/\n/g, ' | '))} / ents: ${await G(A, () => window.__docao.entities.map((e) => e.name + ':' + e.team).join(','))})`);
await D.context().close();
// 6) Vermelho fecha 5 zonas → fim com vitória do time
for (let i = 0; i < 7; i++) {
  if ((await G(A, () => window.__docao.state)) !== 'playing') break;
  const s0 = await G(A, () => window.__docao.teamScore[0]); await toZone(A);
  await until(A, (s) => window.__docao.teamScore[0] > s || window.__docao.state !== 'playing', 25000, s0);
  console.log('placar:', JSON.stringify(await G(A, () => window.__docao.teamScore)));
}
ok(await until(A, () => window.__docao.state === 'over', 6000), 'partida acabou após 5 zonas');
const win = await G(A, () => document.getElementById('winner').textContent); ok(/Vermelho venceu/.test(win), `tela final: "${win}"`);
await A.screenshot({ path: `${SHOTS}/17-online-vitoria.png` });
console.log('\nERROS:', errors.length ? errors : 'nenhum'); if (errors.length) fails.push('erros de console');
await browser.close(); console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
