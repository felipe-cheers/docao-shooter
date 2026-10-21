// Teste offline: morte = BACON (bot e jogador local), sequência de screenshots 19-bacon-* e câmera da morte.
// Uso: SITE=http://localhost:8124/ node test-bacon.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + ' ' + e.stack));
await page.addInitScript(() => { localStorage.setItem('docao.primary', '0'); localStorage.setItem('docao.map', 'vizinhanca-cheers'); localStorage.setItem('docao.name', 'Matheus'); localStorage.setItem('docao.skin', 'clube'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(2000);
const G = (fn, a) => page.evaluate(fn, a); const wait = (ms) => page.waitForTimeout(ms);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 30000, polling: 16 }); };
const untilGame = async (t) => { await G((t) => { window.__stopAt = t; }, t); await page.waitForFunction((t) => window.__docao.time >= t - 1e-6, t, { timeout: 30000, polling: 16 }); }; // para o tempo exatamente em t
const resume = () => G(() => { window.__stopAt = null; });
await page.selectOption('#modeSel', 'dm'); await page.selectOption('#botCount', '4');
await page.click('#playBtn'); await wait(1500);
// palco: todos os bots congelados; jogador invulnerável; um bot 4 m à frente num lugar aberto
const setup = await G(() => {
  const g = window.__docao, p = g.player, bots = g.entities.filter((e) => !e.isPlayer);
  for (const b of bots) { b.frozen = true; b.passive = true; }
  p.invulnUntil = g.time + 999;
  for (const s of g.spawns) {
    const yaw = Math.random() * 6.28, dx = -Math.sin(yaw) * 4, dz = -Math.cos(yaw) * 4, x = s.x + dx, z = s.z + dz, y = g.groundAt(x, z, s.y + 0.5);
    if (Math.abs(y - s.y) > 0.3 || g.collides(x, y, z)) continue;
    p.pos.set(s.x, s.y, s.z); p.yaw = yaw; p.pitch = -0.1;
    const t = bots[0]; t.pos.set(x, y, z); t.yaw = yaw + Math.PI; t.alive = true; t.hp = 100; t.invulnUntil = 0; t.bubble.visible = false; t.model.group.visible = true;
    if (!g.visible(t)) continue;
    // câmera lateral livre com linha de visão até o bot
    let cam = null; for (let i = 0; i < 16 && !cam; i++) { const a = yaw + 1.2 + i * 0.39, c = [x + Math.sin(a) * 3.6, y + 1.9, z + Math.cos(a) * 3.6]; if (g.los([x, y + 0.5, z], c) && g.los([x, y + 1.5, z], c)) cam = c; }
    if (!cam) continue;
    for (const o of bots) if (o !== t) { o.pos.set(999, -50, 999); o.model.group.visible = false; }
    window.__t = t; window.__camP = cam; return { ok: true, p: [s.x, s.y, s.z], t: [x, y, z] };
  }
  return { ok: false };
});
ok(setup.ok, 'palco montado (bot à vista)');
await waitGame(0.3);
// câmera lateral fixa no bot
await G(() => { const t = window.__t; window.__cam = { p: window.__camP, t: [t.pos.x, t.pos.y + 0.7, t.pos.z] }; document.getElementById('hud').style.visibility = 'hidden'; });
await waitGame(0.2); await page.screenshot({ path: `${SHOTS}/19-bacon-0-vivo.png` });
const before = await G(() => ({ ...window.__docao.bacon.byKind }));
const t0 = await G(() => { const g = window.__docao; g.damage(window.__t, 999, g.player, 0, false); window.__stopAt = g.time + 0.07; return g.time; });
ok(await G(() => !window.__t.alive), 'bot morreu');
const seq = [[0.07, '1-pop'], [0.2, '2-puf'], [0.45, '3-voando'], [1.3, '4-fritando'], [3.2, '5-sumindo']];
const info = {};
for (const [dt, nm] of seq) {
  await untilGame(t0 + dt); await page.screenshot({ path: `${SHOTS}/19-bacon-${nm}.png` });
  info[nm] = await G(() => { const b = window.__docao.activeBacons().find((x) => x.ent === window.__t); const m = window.__t.model.group; return { bacon: !!b, vis: b && b.grp.visible, rest: b && b.rest, s: b && +b.grp.scale.x.toFixed(2), y: b && +b.pos.y.toFixed(2), model: m.visible, ms: +m.scale.x.toFixed(2) }; });
}
console.log(JSON.stringify(info));
const after = await G(() => ({ ...window.__docao.bacon.byKind }));
ok(after.bot === before.bot + 1, `bot virou bacon (${before.bot} → ${after.bot})`);
ok(info['1-pop'].model && info['1-pop'].ms > 1.05 && !info['1-pop'].vis, 'pop: Docão achata antes de virar bacon');
ok(info['3-voando'].vis && !info['3-voando'].model, 'puf: bacon no lugar do Docão');
ok(Math.abs(info['4-fritando'].y - setup.t[1]) < 0.2, 'bacon caiu e ficou no chão');
await untilGame(t0 + 3.6);
ok(await G(() => !window.__docao.activeBacons().some((x) => x.ent === window.__t)), 'bacon some depois de ~3 s');
await resume();
// jogador: câmera da morte em 3ª pessoa no próprio bacon, cartões depois
await G(() => { window.__cam = null; document.getElementById('hud').style.visibility = ''; const g = window.__docao, p = g.player; p.invulnUntil = 0; g.kill(p); p.respawnAt = g.time + 30; window.__pd = g.time; window.__stopAt = g.time + 0.5; });
const pd = await G(() => window.__pd);
await untilGame(pd + 0.5);
const c1 = await G(() => ({ pick: !document.getElementById('deathpick').classList.contains('hidden'), cam: window.__docao.deathCam.on, d: window.__docao.deathCam.dist, byKind: { ...window.__docao.bacon.byKind } }));
await page.screenshot({ path: `${SHOTS}/19-bacon-camera-morte.png` });
ok(c1.byKind.player >= 1, 'jogador virou bacon');
ok(c1.cam && c1.d >= 0.8 && !c1.pick, `câmera da morte em 3ª pessoa (${c1.d.toFixed(1)} m) antes dos cartões`);
await untilGame(pd + 1.5);
ok(await G(() => !document.getElementById('deathpick').classList.contains('hidden')), 'cartões de arma aparecem depois da câmera do bacon');
await page.screenshot({ path: `${SHOTS}/19-bacon-camera-cartoes.png` });
await resume(); await G(() => { const g = window.__docao; g.player.respawnAt = g.time; });
ok(await page.waitForFunction(() => window.__docao.player.alive, null, { timeout: 10000 }).then(() => true, () => false), 'renasceu normalmente');
ok(await G(() => !window.__docao.deathCam.on), 'câmera volta pra 1ª pessoa');
// estresse: várias mortes seguidas (pool)
for (let i = 0; i < 16; i++) { await G(() => { const g = window.__docao; for (const b of g.entities.filter((e) => !e.isPlayer)) { b.alive = true; b.hp = 100; b.invulnUntil = 0; g.kill(b); } }); await waitGame(0.06); }
await waitGame(0.3);
const st = await G(() => ({ active: window.__docao.bacon.active, spawned: window.__docao.bacon.spawned }));
ok(st.active <= 14 && st.spawned >= 50, `pool aguenta 64 mortes seguidas (${st.active} ativos, ${st.spawned} no total)`);
console.log('\nerros de console:', errors.length ? errors : 'nenhum');
if (errors.length) fails.push('erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
