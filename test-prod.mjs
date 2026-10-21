// Smoke test do modo online contra um servidor real (sem ALLOW_TEST: ninguém teleporta, todo mundo anda de verdade).
// Uso: node test-prod.mjs <urlDoSite> [urlDoServidor]   (sem servidor = usa o padrão do config.js)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || '';
const SHOTS = process.env.SHOTS || 'screenshots/prod'; mkdirSync(SHOTS, { recursive: true });
const sq = SERVER ? `server=${encodeURIComponent(SERVER)}` : '';
const errors = [], fails = []; const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + msg); if (!c) fails.push(msg); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function client(name, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] [${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] [pageerror] ${e.message}`));
  await page.addInitScript((n) => { localStorage.setItem('docao.name', n); localStorage.setItem('docao.primary', '0'); }, name);
  const qs = [sq, query].filter(Boolean).join('&');
  await page.goto(`${SITE}${qs ? '?' + qs : ''}`, { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(1500);
  return page;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(page, fn, ms = 10000, arg) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(150); } return false; }
// "caçador": anda pelo grafo de navegação até o alvo (movimento legítimo, velocidade normal) e atira quando enxerga
const HUNT = ([target, fire]) => {
  const g = window.__docao; if (window.__hunt) return;
  const keyEv = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code }));
  window.__hunt = { kills0: g.player.kills, path: null, at: 0 };
  const step = () => {
    const H = window.__hunt; if (!H || H.stop) { keyEv('keyup', 'KeyW'); keyEv('keyup', 'KeyA'); keyEv('keyup', 'KeyD'); document.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); return; }
    requestAnimationFrame(step);
    const p = g.player, t = g.entities.find((e) => e.name === target);
    if (!p || !p.alive || !t || !t.alive) { keyEv('keyup', 'KeyW'); document.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); H.path = null; return; }
    const d = t.pos.distanceTo(p.pos), vis = g.visible(t);
    if (vis && d < 30) { // mira e atira
      keyEv('keyup', 'KeyW');
      const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, h = t.pos.y + 1.1 - (p.pos.y + 1.6);
      p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(h, Math.hypot(dx, dz));
      if (fire && p.invulnUntil <= g.time) { const c = document.getElementById('game'); c.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); }
      H.seen = (H.seen || 0) + 1; return;
    }
    document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    if (!H.path || performance.now() - H.at > 1500) { H.path = g.nav.path(p.pos, t.pos) || []; H.at = performance.now(); }
    while (H.path.length && Math.hypot(H.path[0].x - p.pos.x, H.path[0].z - p.pos.z) < 0.8) H.path.shift();
    const n = H.path[0] || t.pos; p.yaw = Math.atan2(-(n.x - p.pos.x), -(n.z - p.pos.z)); p.pitch = 0;
    // preso numa quina (mapas v2 têm portas/paredes): desvia de lado + pula e recalcula o caminho
    const now = performance.now();
    if (!H.chk || now - H.chk.t > 700) { if (H.chk && Math.hypot(p.pos.x - H.chk.x, p.pos.z - H.chk.z) < 0.3) { H.side = H.side === 'KeyA' ? 'KeyD' : 'KeyA'; H.unstickUntil = now + 450; H.path = null; keyEv('keydown', 'Space'); setTimeout(() => keyEv('keyup', 'Space'), 50); } H.chk = { t: now, x: p.pos.x, z: p.pos.z }; }
    if (H.unstickUntil > now) { keyEv('keyup', 'KeyW'); keyEv('keydown', H.side); return; }
    if (H.side) keyEv('keyup', 'KeyA'), keyEv('keyup', 'KeyD');
    keyEv('keydown', 'KeyW'); if (p.onGround && Math.random() < 0.01) keyEv('keydown', 'Space'), setTimeout(() => keyEv('keyup', 'Space'), 50);
  };
  step();
};

// 1) criar sala
const A = await client('Ana');
await A.click('#onlineBtn'); await A.waitForTimeout(300);
await A.selectOption('#roomMap', 'bar-cheers'); await A.selectOption('#roomMax', '3'); await A.selectOption('#roomBots', '0');
await A.click('#createBtn');
ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'Ana criou a sala no servidor');
const code = await G(A, () => window.__docao.online.code); const link = await A.url(); console.log('sala:', code, '·', link);
ok(/^[A-Z]{4}$/.test(code), 'código de 4 letras');
// 2) Beto pelo link
const B = await client('Beto', `sala=${code}`);
ok(await until(B, () => window.__docao.online && window.__docao.online.myId > 0), 'Beto entrou pelo link ?sala=');
ok(await until(A, () => document.querySelectorAll('#lobbyPlayers tr').length === 3), 'lobby lista os 2 jogadores');
await A.waitForTimeout(2500);
await A.screenshot({ path: `${SHOTS}/16-prod-lobby.png` });
const pingLobby = await G(A, () => window.__docao.online.net.ping); console.log('ping (lobby):', pingLobby, 'ms');
// 3) partida
await A.click('#startOnline');
for (const [p, n] of [[A, 'Ana'], [B, 'Beto']]) ok(await until(p, () => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive), `${n} jogando`);
ok(await until(A, () => window.__docao.entities.some((e) => e.name === 'Beto' && e.alive && e.model.group.visible), 4000), 'Ana recebe o Beto do servidor');
// Beto parado; Ana caça e atira
await G(A, HUNT, ['Beto', false]); await G(B, HUNT, ['Ana', false]); // os dois andam um até o outro (mapas v2 são fechados)
const met = await until(A, () => (window.__hunt.seen || 0) > 5, 90000);
ok(met, 'Ana e Beto chegaram andando até se ver');
await G(B, () => { if (window.__hunt) window.__hunt.stop = true; window.__hunt = null; });
await wait(300);
const near = await G(A, () => { const g = window.__docao, b = g.entities.find((e) => e.name === 'Beto'); return { d: +b.pos.distanceTo(g.player.pos).toFixed(1), vis: g.visible(b) }; });
console.log('Ana → Beto', near);
// confere que a posição que a Ana vê do Beto bate com a posição real do Beto
const bReal = await G(B, () => window.__docao.player.pos.toArray()), bSeen = await G(A, () => window.__docao.entities.find((e) => e.name === 'Beto').pos.toArray());
const err = Math.hypot(bReal[0] - bSeen[0], bReal[2] - bSeen[2]); ok(err < 1, `posição do Beto na tela da Ana confere (erro ${err.toFixed(2)} m)`);
await A.screenshot({ path: `${SHOTS}/16-prod-dois-jogadores.png` });
await G(A, () => { window.__hunt.stop = true; window.__hunt = null; }); await wait(100);
await G(A, HUNT, ['Beto', true]);
const killed = await until(B, () => !window.__docao.player.alive, 30000);
ok(killed, 'Ana carimbou o Beto (dano e abate decididos no servidor)');
ok(await until(A, () => (window.__feedLog || []).some((l) => l.includes('Ana carimbou Beto')), 4000), 'kill feed da Ana');
ok(await until(B, () => (window.__feedLog || []).some((l) => l.includes('Ana carimbou Beto')), 4000), 'kill feed do Beto');
ok(await until(B, () => { const a = window.__docao.entities.find((e) => e.name === 'Ana'); return a && a.kills >= 1; }, 4000), 'placar do Beto: Ana com 1+ abate');
await A.screenshot({ path: `${SHOTS}/16-prod-abate.png` });
await B.screenshot({ path: `${SHOTS}/16-prod-beto-carimbado.png` });
await G(A, () => { if (window.__hunt) window.__hunt.stop = true; });
ok(await until(B, () => window.__docao.player.alive, 8000), 'Beto renasceu');
const ping = await G(A, () => window.__docao.online.net.ping); ok(ping > 0 && ping < 1000, `ping medido (${ping} ms)`);
await G(A, () => document.getElementById('tabboard').classList.remove('hidden')); await wait(400);
await A.screenshot({ path: `${SHOTS}/16-prod-placar.png` }); await G(A, () => document.getElementById('tabboard').classList.add('hidden'));
await G(B, () => window.__docao.leaveOnline());
ok(await until(A, () => !window.__docao.entities.some((e) => e.name === 'Beto'), 5000), 'Beto saiu e sumiu');
for (const p of [A, B]) await p.context().close();
// 4) sala com bots
const D = await client('Duda');
await D.click('#onlineBtn'); await D.selectOption('#roomMap', 'arena'); await D.selectOption('#roomMax', '4'); await D.selectOption('#roomBots', '1'); await D.click('#createBtn');
ok(await until(D, () => window.__docao.online && window.__docao.online.myId > 0), 'Duda criou sala com bots'); await D.click('#startOnline');
ok(await until(D, () => window.__docao.state === 'playing' && window.__docao.player.alive), 'Duda jogando');
ok(await until(D, () => window.__docao.entities.filter((e) => e.bot).length === 3, 4000), '3 bots do servidor');
const p0 = await G(D, () => window.__docao.entities.filter((e) => e.bot).map((e) => e.pos.toArray())); await wait(3000);
const p1 = await G(D, () => window.__docao.entities.filter((e) => e.bot).map((e) => e.pos.toArray()));
ok(p0.some((a, i) => Math.hypot(a[0] - p1[i][0], a[2] - p1[i][2]) > 1), 'bots andam');
ok(await until(D, () => (window.__feedLog || []).length > 0 || window.__docao.explosions > 0, 30000), 'bots lutando (abate ou explosão chegou)');
await D.screenshot({ path: `${SHOTS}/16-prod-bots.png` });
console.log('kill feed:', await G(D, () => (window.__feedLog || []).slice(-3)));
console.log('\nerros de console:', errors.length ? errors : 'nenhum'); if (errors.length) fails.push('erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
