// Teste dos mapas: menu/seletor, cada mapa carrega, bots andam ~10 s (não travam), bot navega até o andar de cima,
// jogador sobe escadas/rampas e anda debaixo de lajes (teto com colisão). Gera screenshots 14-*.
import { chromium } from 'playwright';
const errors = [];
const failed = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.goto(process.env.SITE || 'http://localhost:8123/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__thumbsReady, null, { timeout: 120000 });
const ev = (f, a) => page.evaluate(f, a);
const waitGame = async (sec) => { const t0 = await ev(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 60000, polling: 16 }); };
const out = { menu: {}, maps: {} };

// ---- menu: seletor de mapas ----
await page.click('#mapBtn'); await page.waitForTimeout(500);
out.menu.cards = await ev(() => [...document.querySelectorAll('#mapGrid .mapcard b')].map((b) => b.textContent));
out.menu.thumbs = await ev(() => [...document.querySelectorAll('#mapGrid .thumb')].filter((t) => t.style.backgroundImage.includes('data:image')).length);
await page.screenshot({ path: 'screenshots/14-menu-mapas.png' });
await page.click('#mapGrid .mapcard[data-map="mercadao"]'); await page.waitForTimeout(400);
out.menu.saved = await ev(() => localStorage.getItem('docao.map'));
await page.reload(); await page.waitForFunction(() => window.__docao); await page.waitForTimeout(800);
out.menu.afterReload = await ev(() => [document.getElementById('mapName').textContent, window.__docao.map.id]);
await page.screenshot({ path: 'screenshots/14-menu-mercadao.png' });
await page.click('#mapBtn'); await page.waitForTimeout(300); await page.click('#mapGrid .mapcard[data-map="random"]'); await page.waitForTimeout(300);
out.menu.random = await ev(() => [localStorage.getItem('docao.map'), document.getElementById('mapName').textContent]);
await ev(() => window.__docao.selectMap('arena'));

const ids = process.argv[2] ? process.argv[2].split(',') : await ev(() => window.__docao.MAPS.map((m) => m.id)); // node test-maps.mjs [id,id]
for (const id of ids) {
  const R = out.maps[id] = {};
  await ev((id) => { const D = window.__docao; D.startGame(id); D.player.invulnUntil = 1e9; }, id);
  await waitGame(0.2);
  const info = await ev(() => { const D = window.__docao; return { name: D.map.name, nodes: D.nav.good.length, edges: D.nav.edges, navMs: Math.round(D.navMs), solids: D.solids.length }; });
  Object.assign(R, info);
  // ---- fase 1: bots jogando normalmente por ~10 s (devem andar e não travar) ----
  const T = await ev(() => window.__docao.map.test);
  const goal = T.roof || T.stairs;
  await ev(() => { const D = window.__docao; D.player.pos.set(0, 0, 0); D.entities.forEach((e) => { e.travel = 0; e.stuckCount = 0; }); });
  const t0 = await ev(() => window.__docao.time); const samples = [];
  for (;;) {
    await waitGame(1);
    const s = await ev(() => { const D = window.__docao; return { t: D.time, bots: D.entities.filter((e) => !e.isPlayer).map((e) => ({ alive: e.alive, x: e.pos.x, y: e.pos.y, z: e.pos.z, frozen: !!e.frozen })) }; });
    samples.push(s); if (s.t - t0 >= 10) break;
  }
  const bots = await ev(() => window.__docao.entities.filter((e) => !e.isPlayer).map((e) => ({ n: e.name, travel: +(e.travel || 0).toFixed(1), stuck: e.stuckCount || 0 })));
  // "parado" = bot vivo que ficou 3 s seguidos sem sair de 1 m (pode ser só ele mirando parado; o travamento real é o contador stuck)
  bots.forEach((b, i) => { let run = 0, worst = 0; for (let k = 1; k < samples.length; k++) { const a = samples[k - 1].bots[i], c = samples[k].bots[i]; if (a.alive && c.alive && Math.hypot(a.x - c.x, a.z - c.z) < 1 / 3) { run++; worst = Math.max(worst, run); } else run = 0; } b.stillRun = worst; });
  R.bots = bots; R.botsMoving = bots.filter((b) => b.travel > 5).length + '/' + bots.length; R.botsStuckEvents = bots.reduce((a, b) => a + b.stuck, 0); R.botsStill3s = bots.filter((b) => b.stillRun >= 3).length;
  // ---- fase 2: um bot sozinho (os outros congelados) vai do térreo até o andar de cima pelo grafo A* ----
  await ev((g) => { const D = window.__docao; D.entities.forEach((e) => { if (!e.isPlayer) e.frozen = true; });
    const b = D.entities.find((e) => !e.isPlayer && e.alive) || D.entities[1]; window.__nb = b; b.frozen = false; b.passive = true; b.invulnUntil = 1e9;
    b.pos.set(g.from[0], g.from[1], g.from[2]); b.vel.set(0, 0, 0); b.path = null; b.target = null; b.lastSeenAt = -99; b.hp = 100; b.nades = 3; // sem desvio pra pegar copo/vida
    b.wp = b.pos.clone().set(g.to[0], g.to[1], g.to[2]); window.__navGoal = b.wp; window.__navReached = null; D.player.pos.set(0, 60, 0); D.player.invulnUntil = 1e9;
    window.__navT0 = D.time;
    const tick = () => { if (window.__navReached) return; const gg = window.__navGoal; if (Math.hypot(b.pos.x - gg.x, b.pos.z - gg.z) < 1.6 && Math.abs(b.pos.y - gg.y) < 0.4) { window.__navReached = D.time; b.frozen = true; return; }
      if (b.wp !== gg) b.wp = gg; requestAnimationFrame(tick); }; tick(); }, goal);
  const n0 = await ev(() => window.__navT0);
  await page.waitForFunction((n0) => window.__navReached || window.__docao.time - n0 > 15, n0, { timeout: 90000, polling: 50 });
  R.botNav = await ev((t0) => window.__navReached > 0 ? `chegou ao andar de cima em ${(window.__navReached - t0).toFixed(1)}s` : `não chegou (${window.__nb.pos.x.toFixed(1)},${window.__nb.pos.y.toFixed(1)},${window.__nb.pos.z.toFixed(1)})`, n0);
  await ev(() => { window.__nb.passive = false; window.__nb.frozen = false; window.__navReached = window.__navReached || -1; });
  // ---- jogador: escada/rampa e debaixo da laje ----
  const walk = (seg, jumpMid) => ev(([g, jumpMid]) => new Promise((res) => { // anda segurando W; checado a cada quadro
    const D = window.__docao, p = D.player; D.entities.forEach((e) => { if (!e.isPlayer) e.frozen = true; });
    const pts = [...(g.via || []).map(([x, z]) => [x, 0, z]), g.to]; let pi = 0; // via: pontos de virada (ex.: sair da rampa pro lado no patamar)
    const aim = () => { p.yaw = Math.atan2(-(pts[pi][0] - p.pos.x), -(pts[pi][2] - p.pos.z)); };
    p.pos.set(g.from[0], g.from[1], g.from[2]); p.vel.set(0, 0, 0); aim(); p.pitch = 0; p.bonk = false;
    const key = (t, c) => document.dispatchEvent(new KeyboardEvent(t, { code: c }));
    const tot = Math.hypot(g.to[0] - g.from[0], g.to[2] - g.from[2]); let maxY = p.pos.y, maxHead = 0, jumped = false; const t0 = D.time;
    key('keydown', 'KeyW');
    const tick = () => {
      maxY = Math.max(maxY, p.pos.y); maxHead = Math.max(maxHead, p.pos.y + 2.0);
      if (pi < pts.length - 1 && Math.hypot(pts[pi][0] - p.pos.x, pts[pi][2] - p.pos.z) < 0.35) { pi++; aim(); }
      if (pi < pts.length - 1) aim();
      const d = pi < pts.length - 1 ? 99 : Math.hypot(g.to[0] - p.pos.x, g.to[2] - p.pos.z);
      if (jumpMid && !jumped && 1 - d / tot > 0.5) { // para no meio (debaixo da laje), pula parado e segue
        jumped = true; key('keyup', 'KeyW'); const tj = D.time; let pressed = false;
        const hop = () => { maxHead = Math.max(maxHead, p.pos.y + 2.0);
          if (!pressed && D.time - tj > 0.35) { pressed = true; key('keydown', 'Space'); }
          if (pressed && !p.onGround) key('keyup', 'Space');
          if (D.time - tj < 1.3) return requestAnimationFrame(hop); key('keyup', 'Space'); key('keydown', 'KeyW'); requestAnimationFrame(tick); };
        return hop();
      }
      if (d < 0.5 || D.time - t0 > 10) { key('keyup', 'KeyW'); const t1 = D.time; const settle = () => { maxHead = Math.max(maxHead, p.pos.y + 2.0); if (D.time - t1 < 0.6) return requestAnimationFrame(settle);
        res({ end: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(2), +p.pos.z.toFixed(1)], dist: +Math.hypot(g.to[0] - p.pos.x, g.to[2] - p.pos.z).toFixed(2), maxY: +maxY.toFixed(2), maxHead: +maxHead.toFixed(2), bonk: !!p.bonk, secs: +(t1 - t0).toFixed(1) }); }; settle(); return; }
      requestAnimationFrame(tick);
    }; tick();
  }), [seg, !!jumpMid]);
  for (const k of ['stairs', 'roof']) if (T[k]) { const r = await walk(T[k]); r.ok = r.dist < 1.2 && Math.abs(r.end[1] - T[k].level) < 0.15; R[k] = r; }
  if (T.under) { const r = await walk(T.under, true); r.ok = r.dist < 1.2 && r.end[1] < 0.05 && r.maxHead <= T.under.ceil + 0.02; R.under = r; } // pulo debaixo da laje: a cabeça nunca passa do teto
  // ---- screenshot de gameplay ----
  await ev(() => { const D = window.__docao, v = D.map.view, p = D.player; p.pos.set(v[0], v[1], v[2]); p.vel.set(0, 0, 0); p.yaw = v[3]; p.pitch = v[4];
    const bots = D.entities.filter((e) => !e.isPlayer && e.alive); let k = 0;
    for (const dist of [9, 14, 19, 12, 7]) { const b = bots[k]; if (!b) break; const side = (k % 2 ? 1 : -1) * (1.2 + k * 0.7);
      const x = v[0] - Math.sin(v[3]) * dist + Math.cos(v[3]) * side, z = v[2] - Math.cos(v[3]) * dist - Math.sin(v[3]) * side, y = D.groundAt(x, z, v[1] + 0.5);
      if (!D.collides(x, y, z)) { b.pos.set(x, y, z); b.yaw = v[3]; k++; } }
    D.entities.forEach((e) => { e.frozen = false; e.think = 0; }); p.invulnUntil = D.time + 0.3; });
  await waitGame(0.5);
  await page.screenshot({ path: `screenshots/14-mapa-${id}.png` });
  for (const k of ['stairs', 'roof', 'under']) if (R[k] && !R[k].ok) failed.push(`${id}:${k}`);
  if (!/chegou ao andar/.test(R.botNav)) failed.push(`${id}:botNav`);
  console.log(id, JSON.stringify({ ...R, bots: R.bots.map((b) => `${b.n}:${b.travel}m/st${b.stuck}/still${b.stillRun}`).join(' ') }));
}
// fim de partida: botão "Próximo mapa"
await ev(() => { window.__docao.loadMap('bar-cheers'); window.__docao.startGame('bar-cheers'); }); await waitGame(0.3);
await ev(() => window.__docao.endGame()); await page.waitForTimeout(400);
out.over = await ev(() => document.getElementById('overMap').textContent);
await page.screenshot({ path: 'screenshots/14-fim-proximo-mapa.png' });
await page.click('#nextMapBtn'); await waitGame(0.3);
out.nextMap = await ev(() => [window.__docao.state, window.__docao.map.id]);
console.log('menu:', JSON.stringify(out.menu)); console.log('fim:', out.over, '→', JSON.stringify(out.nextMap));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
if (failed.length) { console.log('FALHAS:', failed.join(', ')); process.exit(1); } else console.log('TUDO OK (escadas, telhados, lajes e bots em todos os mapas)');
await browser.close();
