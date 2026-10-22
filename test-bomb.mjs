// Teste offline do Modo Bomba (protótipo): rodada, plantar → explosão (ponto do Ataque), desarme (ponto da Defesa),
// tempo esgotado (Defesa), troca de lado depois da 12ª e fim na 13ª. Uso: SITE=http://localhost:8124/ node test-bomb.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + ' ' + e.stack));
await page.addInitScript((map) => { localStorage.setItem('docao.primary', '0'); localStorage.setItem('docao.map', map); localStorage.setItem('docao.name', 'Matheus'); }, process.env.MAP || 'arena');
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(1500);
const G = (fn, a) => page.evaluate(fn, a); const wait = (ms) => page.waitForTimeout(ms);
const until = async (fn, ms = 8000, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, a)) return true; await wait(100); } return false; };
await page.selectOption('#modeSel', 'bomb'); await page.click('#menuTeamBtns .teambtn.t0'); await page.selectOption('#botCount', '5');
await G(() => document.getElementById('playBtn').click()); await wait(1500);
const st = await G(() => { const g = window.__docao, B = g.bomb, S = B.S; return { mode: g.mode, round: S.round, phase: S.phase, carrier: S.carrier, team: g.player.team, sites: B.L.sites.map((s) => [s.name, +s.x.toFixed(1), +s.z.toFixed(1)]), teams: g.entities.map((e) => e.team), hud: !document.getElementById('bombhud').classList.contains('hidden'), banner: document.querySelector('#bombBanner .b1').textContent }; });
console.log(JSON.stringify(st));
ok(st.mode === 'bomb' && st.round === 1 && st.phase === 'prep' && st.carrier > 0, 'Bomba offline: rodada 1 em preparação, alguém carrega o botijão');
ok(st.hud && /Rodada 1/.test(st.banner), 'HUD da Bomba + faixa "Rodada 1"');
ok(st.teams.filter((t) => t === 0).length === 3 && st.teams.filter((t) => t === 1).length === 3, 'times 3 × 3');
// preparação: parado
const p0 = await G(() => window.__docao.player.pos.toArray()); await page.keyboard.down('KeyW'); await wait(700); await page.keyboard.up('KeyW');
const p1 = await G(() => window.__docao.player.pos.toArray());
ok(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) < 0.05, 'preparação: o Docão não anda');
await page.screenshot({ path: `${SHOTS}/30-bomba-prep.png` });
await G(() => window.__docao.bomb.skip()); await wait(600);
ok(await G(() => window.__docao.bomb.S.phase === 'live'), 'depois da preparação: VALENDO (fase ao vivo)');
await wait(2500); // bots andando
await page.screenshot({ path: `${SHOTS}/30-bomba-live.png` });
// 1) plantar → explosão → ponto do Ataque
await G(() => window.__docao.bomb.plant(0)); await wait(400);
const pl = await G(() => { const S = window.__docao.bomb.S; return { phase: S.phase, site: S.site, feed: (window.__feedLog || []).slice(-3), beeps: window.__bombBeeps || 0 }; });
ok(pl.phase === 'planted' && pl.site === 0 && pl.feed.some((l) => /plantou o botijão no A/.test(l)), `plantou no A (${pl.feed.join(' | ')})`);
await wait(1200); ok(await G(() => (window.__bombBeeps || 0) >= 1), 'botijão plantado bipando');
await page.screenshot({ path: `${SHOTS}/30-bomba-plantado.png` });
await G(() => { const g = window.__docao, b = g.bomb.S.bomb; const v = g.entities.find((e) => !e.isPlayer); v.frozen = true; v.pos.set(b.x + 2, b.y, b.z); g.bomb.skip(); }); await wait(500);
const bo = await G(() => { const g = window.__docao, S = g.bomb.S; return { phase: S.phase, score: S.score.slice(), reason: S.reason, booms: window.__bombBooms || 0, deadNear: g.entities.filter((e) => e.frozen && !e.alive).length }; });
ok(bo.phase === 'end' && bo.reason === 'boom' && bo.score[0] === 1 && bo.booms === 1, `explosão encerra a rodada e o Ataque (Vermelho) pontua (${JSON.stringify(bo.score)})`);
ok(bo.deadNear === 1, 'quem estava perto do botijão morreu na explosão');
await page.screenshot({ path: `${SHOTS}/30-bomba-explodiu.png` });
await G(() => { for (const e of window.__docao.entities) e.frozen = false; window.__docao.bomb.skip(); }); await wait(500);
const r2 = await G(() => { const g = window.__docao, S = g.bomb.S; return { round: S.round, phase: S.phase, allAlive: g.entities.every((e) => e.alive && e.hp === 100) }; });
ok(r2.round === 2 && r2.phase === 'prep' && r2.allAlive, 'rodada 2: todo mundo de volta, vida cheia');
// 2) desarme: o jogador (Vermelho = Ataque) não pode; usa um bot da Defesa congelado segurando E → coloca o jogador no Azul pra testar a tecla
await G(() => { const g = window.__docao; g.applyTeam(g.player, 1); g.bomb.skip(); }); await wait(300);
await G(() => { const g = window.__docao; for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(-30, 0, 30); } const atk = g.entities.find((e) => !e.isPlayer && e.team === 0); g.bomb.plant(1, atk.id); const b = g.bomb.S.bomb; g.player.pos.set(b.x + 0.6, b.y, b.z); g.player.invulnUntil = g.time + 99; });
await wait(300); await page.keyboard.down('KeyE'); // o tempo de jogo anda mais devagar que o relógio no swiftshader: espera pelo progresso
await until(() => window.__docao.bomb.S.defuseProg >= 1.5, 30000);
const half = await G(() => window.__docao.bomb.S.defuseProg); await page.keyboard.up('KeyE'); await wait(400);
const kept = await G(() => window.__docao.bomb.S.defuseProg);
ok(half >= 1.5 && kept === 0, `soltar antes da metade zera o desarme (${half.toFixed(1)} s → ${kept})`);
await page.keyboard.down('KeyE'); await until(() => window.__docao.bomb.S.defuseProg >= 4, 40000); await page.keyboard.up('KeyE'); await wait(400);
const kept2 = await G(() => window.__docao.bomb.S.defuseProg);
ok(kept2 === 3.5, `passou da metade: fica salvo em 3,5 s (${kept2})`);
await page.keyboard.down('KeyE'); await wait(500); await page.screenshot({ path: `${SHOTS}/30-bomba-desarmando.png` }); await until(() => window.__docao.bomb.S.phase === 'end', 40000); await page.keyboard.up('KeyE'); await wait(300);
const df = await G(() => { const S = window.__docao.bomb.S; return { phase: S.phase, reason: S.reason, score: S.score.slice(), feed: (window.__feedLog || []).slice(-3) }; });
ok(df.phase === 'end' && df.reason === 'defuse' && df.score[1] === 1 && df.feed.some((l) => /desarmou o botijão/.test(l)), `desarmou: ponto da Defesa (${JSON.stringify(df.score)} · ${df.feed.join(' | ')})`);
// 3) tempo esgotado sem plantar
await G(() => { const g = window.__docao; g.bomb.skip(); }); await wait(300); await G(() => window.__docao.bomb.skip()); await wait(300); await G(() => window.__docao.bomb.skip()); await wait(400);
const to = await G(() => { const S = window.__docao.bomb.S; return { phase: S.phase, reason: S.reason, score: S.score.slice(), round: S.round }; });
ok(to.phase === 'end' && to.reason === 'time' && to.score[1] === 2 && to.round === 3, `tempo acabou sem plantar: ponto da Defesa (${JSON.stringify(to)})`);
// 4) troca de lado depois da 12ª
await G(() => { const g = window.__docao; g.applyTeam(g.player, 0); g.bomb.setRound(12, 6, 5); g.bomb.skip(); });
await wait(500); // (estava no fim da rodada: pular = começa a 13ª)
const sw = await G(() => { const g = window.__docao, S = g.bomb.S; return { round: S.round, atk: g.bomb.attackTeam(S.round), mySide: g.bomb.sideOf(S, g.player.team), banners: (window.__bombBanners || []).slice(-3), b1: document.querySelector('#bombBanner .b1').textContent, carrierTeam: (g.entities.find((e) => e.id === S.carrier) || {}).team }; });
ok(sw.round === 13 && sw.atk === 1 && sw.mySide === 1 && sw.carrierTeam === 1, `rodada 13: Azul ataca, você (Vermelho) defende (${JSON.stringify(sw)})`);
ok(sw.b1 === 'Troca de lado!', 'faixa "Troca de lado!"');
await page.screenshot({ path: `${SHOTS}/30-bomba-troca.png` });
// 5) fim aos 13
await G(() => { const g = window.__docao; g.bomb.setRound(14, 12, 8); g.bomb.skip(); }); await wait(300); // 14ª: prep → ao vivo
await G(() => window.__docao.bomb.skip()); await wait(300); // tempo → Defesa (Vermelho na 14ª) = 13
const fin = await G(() => window.__docao.bomb.S.over); await G(() => window.__docao.bomb.skip()); await wait(600);
const end = await G(() => ({ state: window.__docao.state, winner: document.getElementById('winner').textContent, score: window.__docao.bomb.S && window.__docao.bomb.S.score }));
ok(fin && end.state === 'over' && /Vermelho venceu! 13 × 8/.test(end.winner), `partida acaba com 13 (${JSON.stringify(end)})`);
await page.screenshot({ path: `${SHOTS}/30-bomba-fim.png` });
ok(!errors.length, 'sem erros no console' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
console.log(fails.length ? `\n${fails.length} falha(s)` : '\nTudo OK'); process.exit(fails.length ? 1 : 0);
