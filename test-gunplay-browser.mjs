// SITE=http://127.0.0.1:8124 CHROMIUM_EXECUTABLE=/usr/bin/chromium node test-gunplay-browser.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.SITE || 'http://127.0.0.1:8124', { timeout: 120000 });
  await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 });
  await page.selectOption('#modeSel', 'explore');
  await page.evaluate(() => window.__docao.startGame('arena'));
  await page.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player.alive);
  const wait = async (seconds) => {
    const time = await page.evaluate(() => window.__docao.time);
    await page.waitForFunction((t) => window.__docao.time >= t, time + seconds, { timeout: 120000 });
  };
  const equip = async (w) => {
    await page.evaluate((w) => {
      const g = window.__docao, p = g.player;
      p.primary = w; p.slots = [w, 4, 7]; g.switchWeapon(p, w);
      p.pos.set(-30, 0, -25); p.vel.set(0, 0, 0); p.onGround = true;
      p.pitch = 0.1; p.yaw = 0; p.mag = g.WEAPONS.map((w) => w.mag);
      p.reloadEnd = 0; p.nextFire = 0; p.invulnUntil = g.time + 999;
    }, w);
    await wait(0.8);
  };
  const shot = async () => {
    const mag = await page.evaluate(() => { const p = window.__docao.player; return p.mag[p.weapon]; });
    await page.mouse.down();
    await page.waitForFunction((n) => { const p = window.__docao.player; return p.mag[p.weapon] < n; }, mag, { timeout: 120000 });
    await page.mouse.up();
    return page.evaluate(() => ({ ...window.__lastShot, speed: Math.hypot(window.__docao.player.vel.x, window.__docao.player.vel.z) }));
  };
  await equip(0); await page.mouse.move(320, 180);
  const base = await page.evaluate(() => ({ pitch: window.__docao.player.pitch, yaw: window.__docao.player.yaw }));
  await page.mouse.down(); await wait(0.7); await page.mouse.up();
  const spray = await page.evaluate(() => ({ ...window.__docao.player.gunplay, spread: window.__lastShot.spread, pitchBase: window.__docao.player.pitch, yawBase: window.__docao.player.yaw, cameraPitch: window.__docao.camera.rotation.x }));
  assert.ok(spray.shots >= 5 && spray.pitch > 0.04 && spray.spread > 0.01);
  assert.equal(spray.pitchBase, base.pitch); assert.equal(spray.yawBase, base.yaw);
  assert.ok(spray.cameraPitch > base.pitch);
  // Mudar a direção durante o retorno simula a entrada livre do mouse.
  await page.evaluate(() => { const p = window.__docao.player; p.pitch = 0.23; p.yaw = 0.37; });
  await wait(1);
  const recovered = await page.evaluate(() => ({ p: window.__docao.camera.rotation.x, y: window.__docao.camera.rotation.y, recoil: window.__docao.player.gunplay.pitch }));
  assert.ok(Math.abs(recovered.p - 0.23) < 0.001 && Math.abs(recovered.y - 0.37) < 0.001);
  assert.equal(recovered.recoil, 0);
  console.log('OK spray acumula e recupera; retorno respeita a direção escolhida pelo jogador');

  await equip(0); await page.mouse.down({ button: 'right' }); await wait(0.5);
  const stopped = await shot(); await wait(0.6);
  await page.keyboard.down('KeyW'); await wait(0.45);
  const walking = await shot();
  await page.keyboard.up('KeyW'); await wait(0.6);
  await equip(0); await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); await wait(0.6);
  const crouched = await shot();
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); await wait(0.6);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => !window.__docao.player.onGround);
  await page.keyboard.up('Space');
  const airborne = await shot();
  assert.ok(stopped.spread < crouched.spread && crouched.spread < walking.spread && walking.spread < airborne.spread, JSON.stringify({ stopped, crouched, walking, airborne }));
  assert.ok(crouched.speed < walking.speed * 0.65);
  await page.mouse.up({ button: 'right' }); await wait(1.1);
  console.log('OK teclado/ADS: parar > andar agachado > andar em pé > pular em precisão');

  for (const w of [2, 5, 6]) {
    await equip(w);
    const hip = await shot(); assert.ok(hip.spread >= 0.1);
    await wait(2);
    await page.mouse.down({ button: 'right' }); await wait(0.5);
    assert.equal(await page.evaluate(() => window.__docao.scoped), true);
    const scoped = await shot(); assert.equal(scoped.spread, 0);
    await page.mouse.up({ button: 'right' }); await wait(0.3);
  }
  console.log('OK três snipers: no scope impreciso e luneta estabilizada precisa');

  await equip(0); await shot();
  await page.evaluate(() => window.__docao.switchWeapon(window.__docao.player, 4));
  assert.equal(await page.evaluate(() => window.__docao.player.gunplay.pitch), 0);
  await wait(0.5); await shot();
  await page.evaluate(() => window.__docao.kill(window.__docao.player));
  assert.equal(await page.evaluate(() => window.__docao.player.gunplay.pitch), 0);
  await page.evaluate(() => window.__docao.respawn(window.__docao.player));
  assert.equal(await page.evaluate(() => window.__docao.player.gunplay.heat), 0);
  assert.deepEqual(errors, []);
  console.log('OK troca, morte e respawn limpam recoil; sem erros JavaScript');
} finally {
  await browser.close();
}
