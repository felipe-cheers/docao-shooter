// Smoke de Dominação contra um servidor real (sem ALLOW_TEST): times + regra de escolha, progresso da zona (bots), escolha de time no meio.
// Uso: node test-prod-dom.mjs [urlDoSite] [wss://servidor]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', W = process.argv[3] || 'wss://docao-shooter-server.valentimm.workers.dev', H = W.replace(/^ws/, 'http');
const SHOTS = process.env.SHOTS || 'screenshots';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); }; const sl = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await (await fetch(H + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ map: 'arena', max: 6, fillBots: true, mode: 'dom' }) })).json();
ok(/^[A-Z]{4}$/.test(r.code), 'sala de Dominação criada: ' + r.code);
const mk = (n) => new Promise((res) => { const ws = new WebSocket(`${W}/ws/${r.code}?name=${n}&skin=clube&primary=0`); ws.log = []; ws.onmessage = (e) => { if (e.data === 'pong') return; const m = JSON.parse(e.data); ws.log.push(m); if (m.t === 'welcome') { ws.cfg = m.cfg; ws.id = m.id; } if (m.t === 'teamOk') ws.teamOk = m; if (m.t === 'start') ws.start = m; if (m.t === 's') ws.snap = m; if (m.t === 'end') ws.end = m; }; ws.onopen = () => res(ws); });
const a = await mk('Ana'); await sl(600); const b = await mk('Beto'); await sl(600);
ok(a.cfg && a.cfg.mode === 'dom', 'servidor de produção conhece o modo (cfg.mode = dom) → bundle novo');
const waitFor = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms && !f()) await sl(100); return f(); };
a.send(JSON.stringify({ t: 'team', team: 0 })); await waitFor(() => a.teamOk); await sl(500); b.send(JSON.stringify({ t: 'team', team: 0 })); await waitFor(() => b.teamOk);
ok(a.teamOk && a.teamOk.team === 0 && !a.teamOk.blocked, 'Ana escolheu Vermelho');
ok(b.teamOk && b.teamOk.blocked && b.teamOk.team === 1, 'Beto pediu Vermelho com 1×0 → bloqueado, foi pro Azul');
// como um cliente de verdade: manda a própria posição (vinda do servidor) a 10 Hz — o servidor só avança o mundo com mensagens de jogo
let sq = 0; const pump = setInterval(() => { for (const w of [a, b]) { const me = w.snap && w.snap.e.find((x) => x[0] === w.id); if (me) w.send(JSON.stringify({ t: 'u', sq: ++sq, p: [me[1], me[2], me[3]], v: [0, 0, 0], y: 0, pi: 0, g: 1, w: 0 })); } }, 100);
a.send(JSON.stringify({ t: 'start' })); await waitFor(() => a.start, 10000);
const teams = a.start && a.start.ents.map((e) => e.team); const c = [0, 0]; for (const t of teams || []) c[t]++;
console.log('times no início:', JSON.stringify(a.start && a.start.ents.map((e) => [e.name, e.team])));
ok(a.start && a.start.mode === 'dom' && c[0] >= 2 && c[1] >= 2 && Math.abs(c[0] - c[1]) <= 1 && a.start.ents.find((e) => e.name === 'Ana').team === 0 && a.start.ents.find((e) => e.name === 'Beto').team === 1, `2 times equilibrados com bots (${c[0]}×${c[1]}), escolhas mantidas`);
ok(a.start && Array.isArray(a.start.zone), 'zona sorteada: ' + JSON.stringify(a.start && a.start.zone.slice(0, 3)));
// progresso da zona pelos bots (servidor autoritativo)
let maxP = 0, sawCont = false, score = [0, 0]; const t0 = Date.now();
while (Date.now() - t0 < 90000 && score[0] + score[1] < 1) { await sl(250); const d = a.snap && a.snap.d; if (d) { maxP = Math.max(maxP, d[3]); sawCont ||= !!d[5]; score = [d[8], d[9]]; } }
ok(maxP > 0.05, `zona com progresso vindo do servidor (máx ${maxP.toFixed(2)})`);
ok(score[0] + score[1] >= 1, `zona capturada (placar ${score[0]}×${score[1]} em ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log('viu zona contestada:', sawCont);
// escolha de time no meio, num navegador
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript(() => localStorage.setItem('docao.name', 'Caio'));
await page.goto(`${SITE}${SITE.includes('?') ? '&' : '?'}server=${encodeURIComponent(W)}&sala=${r.code}`, { waitUntil: 'load', timeout: 90000 });
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return true; await sl(200); } return false; };
ok(await until(() => window.__docao.state === 'playing' && !document.getElementById('teamPick').classList.contains('hidden'), 30000), 'Caio entrou no meio: "Escolha seu time" antes de nascer');
ok(await page.evaluate(() => !window.__docao.player.alive), 'Caio ainda não nasceu');
await page.click('#teamPickBtns .teambtn.ta');
ok(await until(() => window.__docao.player.alive && window.__docao.player.team >= 0, 10000), 'Caio escolheu Automático e nasceu num time');
ok(await until(() => document.querySelectorAll('#lb .row').length >= 5, 5000), 'placar no canto com todo mundo');
await sl(1500); await page.screenshot({ path: `${SHOTS}/17-prod-dominacao.png` });
ok(!errs.length, 'sem erros na página ' + (errs.join(' | ') || ''));
await browser.close(); clearInterval(pump); a.close(); b.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
