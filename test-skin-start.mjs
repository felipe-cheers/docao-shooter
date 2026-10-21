// Regressão: a skin escolhida aparece logo de cara — vitrine do menu fora do painel (em várias larguras de janela e após redimensionar),
// e no começo da partida (jogador e bots com a skin, inclusive no "Próximo mapa").
// Uso: SITE=http://localhost:8124/ node test-skin-start.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const prev = (page) => page.evaluate(() => { const r = document.querySelector('#menu .panel').getBoundingClientRect(); return { ...window.__docao.previewScreen, right: r.right, w: innerWidth }; });
for (const [w, h] of [[1920, 1080], [1366, 768], [1280, 720], [1024, 768]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(`[${w}] ${e.message}`));
  await page.addInitScript(() => { localStorage.setItem('docao.skin', 'choquinho'); });
  await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  const p = await prev(page);
  ok(p && p.skin === 'choquinho' && p.kids > 0, `${w}x${h}: vitrine com a skin salva (${p && p.skin})`);
  ok(p && p.x > p.right + 40 && p.x < p.w - 40, `${w}x${h}: Docão da vitrine fora do painel (x=${p && p.x.toFixed(0)}, painel até ${p && p.right.toFixed(0)})`);
  if (w === 1024) await page.screenshot({ path: `${SHOTS}/21-skin-vitrine-1024.png` });
  await page.close();
}
// redimensionar a janela
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => { localStorage.setItem('docao.skin', 'fantasminha'); localStorage.setItem('docao.primary', '0'); });
  await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await page.setViewportSize({ width: 1100, height: 700 }); await page.waitForTimeout(600);
  const p = await prev(page); ok(p && p.x > p.right + 40 && p.x < p.w - 40, `após redimensionar pra 1100: vitrine fora do painel (x=${p && p.x.toFixed(0)}, painel até ${p && p.right.toFixed(0)})`);
  // começo da partida: skin no jogador e modelos dos bots visíveis
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.selectOption('#modeSel', 'dm'); await page.click('#playBtn'); await page.waitForTimeout(800);
  const s = await page.evaluate(() => { const g = window.__docao; return { me: g.player.skinId, bots: g.entities.filter((e) => !e.isPlayer).map((e) => !!e.skinId && e.model.group.visible && e.model.group.children.length > 0) }; });
  ok(s.me === 'fantasminha', `partida: jogador com a skin escolhida (${s.me})`);
  ok(s.bots.length && s.bots.every(Boolean), 'partida: bots com skin e modelo visível desde o início');
  await page.evaluate(() => window.__docao.endGame()); await page.waitForTimeout(400); await page.click('#nextMapBtn'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => window.__docao.player.skinId) === 'fantasminha', 'próximo mapa: jogador mantém a skin');
  await page.evaluate(() => { window.__docao.endGame(); }); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('menuBtn') ? document.getElementById('menuBtn').click() : null); await page.waitForTimeout(800);
  const st = await page.evaluate(() => window.__docao.state);
  if (st === 'menu') { const q = await prev(page); ok(q && q.skin === 'fantasminha' && q.x > q.right + 40, `volta ao menu: vitrine com a skin e visível (x=${q && q.x.toFixed(0)})`); }
  await page.close();
}
console.log('erros:', errors.length ? errors.join('\n') : 'nenhum'); ok(!errors.length, 'sem erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
