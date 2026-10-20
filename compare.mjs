import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
const errs = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(e.message));
const shots = [['front', 'rot=0'], ['34', 'rot=0.6'], ['face', 'rot=0&frame=face'], ['side', 'rot=1.57'], ['clube', 'skin=clube&rot=0.4'], ['bone', 'skin=bone&rot=0.3&frame=face']];
for (const [n, qs] of shots) {
  await page.goto(`http://localhost:8123/render.html?${qs}`); await page.waitForFunction(() => window.__done, null, { timeout: 30000 }); await page.waitForTimeout(150);
  await page.screenshot({ path: `/tmp/r_${n}.png` });
}
console.log('errors:', errs.length ? errs : 'none'); await browser.close();
