// Sala de Dominação parada (só bots, ninguém mandando mensagem) e alguém entra no meio: precisa ver a escolha de time e NÃO nascer sozinho.
// Precisa de: cd server && npx wrangler dev --var ALLOW_TEST:1  +  python3 -m http.server 8124.  Uso: node test-online-idle.mjs [site] [ws]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', W = process.argv[3] || 'ws://127.0.0.1:8787', H = W.replace(/^ws/, 'http');
const IDLE = +(process.env.IDLE || 75); // > 60 s: o T velho estouraria a janela de escolha
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); }; const sl = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await (await fetch(H + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ map: 'arena', max: 6, fillBots: true, mode: 'dom' }) })).json();
const mk = (n) => new Promise((res) => { const ws = new WebSocket(`${W}/ws/${r.code}?name=${n}&skin=clube&primary=0`); ws.ev = []; ws.onmessage = (e) => { if (e.data === 'pong') return; const m = JSON.parse(e.data); if (m.t === 'welcome') ws.id = m.id; if (m.t === 'start') ws.start = m; if (m.t === 's') { ws.snap = m; if (m.ev) ws.ev.push(...m.ev); } }; ws.onopen = () => res(ws); });
const a = await mk('Ana'); await sl(500); a.send(JSON.stringify({ t: 'start' })); await sl(1500);
ok(a.start && a.start.mode === 'dom', 'partida de Dominação com bots começou');
console.log(`Ana fica conectada mas calada (aba em segundo plano, só pings) por ${IDLE} s: o mundo para…`);
for (let i = 0; i < IDLE; i++) { a.send('ping'); await sl(1000); }
// 1) navegador entra no meio
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript(() => localStorage.setItem('docao.name', 'Caio'));
await page.goto(`${SITE}?server=${encodeURIComponent(W)}&sala=${r.code}`, { waitUntil: 'load', timeout: 90000 });
const until = async (fn, ms, arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn, arg)) return true; await sl(200); } return false; };
ok(await until(() => window.__docao.state === 'playing' && !document.getElementById('teamPick').classList.contains('hidden'), 30000), 'Caio entrou na sala parada: aparece "Escolha seu time"');
console.log('estado do Caio:', JSON.stringify(await page.evaluate(() => { const g = window.__docao, o = g.online; return { st: g.state, mode: g.mode, tp: document.getElementById('teamPick').className, alive: g.player && g.player.alive, team: g.player && g.player.team, lobby: !document.getElementById('lobby').classList.contains('hidden'), status: o && o.status, err: document.getElementById('onlineErr').textContent }; })));
await sl(10000);
ok(await page.evaluate(() => !window.__docao.player.alive && !document.getElementById('teamPick').classList.contains('hidden')), 'depois de 10 s Caio continua escolhendo (não nasceu sozinho)');
const anaT = a.start.ents.find((x) => x.name === 'Ana').team, want = 1 - anaT;
await page.click(`#teamPickBtns .teambtn.t${want}`);
ok(await until((w) => window.__docao.player.alive && window.__docao.player.team === w, 10000, want), `Caio escolheu ${want ? 'Azul' : 'Vermelho'} (time oposto ao da Ana) e nasceu nele`);
// 2) cliente que entra e não escolhe: espera 60 s de relógio de parede e só então vai no Automático
const d = await mk('Duda'); let sq = 0; const t0 = Date.now(); let spawnedAt = 0;
const pump = setInterval(() => { const me = d.snap && d.snap.e.find((x) => x[0] === d.id); d.send(JSON.stringify({ t: 'u', sq: ++sq, p: me ? [me[1], me[2], me[3]] : [0, 0, 0], v: [0, 0, 0], y: 0, pi: 0, g: 1, w: 0 })); if (!spawnedAt && d.ev.some((e) => e[0] === 'sp' && e[1] === d.id)) spawnedAt = Date.now(); }, 100);
while (!spawnedAt && Date.now() - t0 < 75000) await sl(500);
clearInterval(pump);
const secs = spawnedAt ? (spawnedAt - t0) / 1000 : null;
ok(secs !== null && secs >= 58 && secs <= 66, `Duda não escolheu: nasceu no Automático só após ${secs} s de relógio (esperado ~60)`);
ok(!errs.length, 'sem erros na página ' + errs.join(' | '));
await browser.close(); d.close(); a.close();
// (B) o último humano sai e alguém entra logo depois: a partida tem que continuar rodando (o loop volta)
const r2 = await (await fetch(H + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ map: 'arena', max: 6, fillBots: true, mode: 'dm' }) })).json();
const mk2 = (n) => new Promise((res) => { const ws = new WebSocket(`${W}/ws/${r2.code}?name=${n}&skin=clube&primary=0`); ws.T = []; ws.onmessage = (e) => { if (e.data === 'pong') return; const m = JSON.parse(e.data); if (m.t === 's') ws.T.push(m.T); if (m.t === 'welcome') ws.state = m.state; }; ws.onopen = () => res(ws); });
const e1 = await mk2('Eva'); await sl(500); e1.send(JSON.stringify({ t: 'start' })); await sl(1500); e1.close(); await sl(3000);
const e2 = await mk2('Fábio'); await sl(300); let q = 0; const p2 = setInterval(() => e2.send(JSON.stringify({ t: 'prof', name: 'Fábio' + (q++ % 2) })), 100); await sl(3000); clearInterval(p2);
ok(e2.state === 'playing' && e2.T.length > 20 && e2.T[e2.T.length - 1] - e2.T[0] > 2, `última pessoa saiu e outra entrou: partida continua (${e2.T.length} snapshots, T ${e2.T[0]} → ${e2.T[e2.T.length - 1]})`);
e2.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
