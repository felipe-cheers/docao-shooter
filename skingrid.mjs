import { chromium } from 'playwright';
const ids = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 420, height: 560 } });
const errs = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(e.message));
for (const id of ids) for (const [v, rot] of [['f', 0], ['q', 0.75], ['b', 2.6]]) {
  await page.goto(`http://localhost:8123/render.html?skin=${id}&rot=${rot}&w=420&h=560`); await page.waitForFunction(() => window.__done, null, { timeout: 30000 });
  await page.screenshot({ path: `/tmp/sk_${id}_${v}.png` });
}
console.log('errors:', errs.length ? errs : 'none'); await browser.close();
