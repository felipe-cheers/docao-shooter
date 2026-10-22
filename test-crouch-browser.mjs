// SITE=http://localhost:8124/ SERVER=ws://127.0.0.1:8787 node test-crouch-browser.mjs
// SERVER habilita o teste online; requer wrangler dev local, sem deploy.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const SITE = process.env.SITE || 'http://localhost:8124/';
const SERVER = process.env.SERVER;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let peer;
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER || 'ws://127.0.0.1:8787')}`, { timeout: 120000 });
  await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 });
  await page.selectOption('#modeSel', 'explore');
  await page.evaluate(() => window.__docao.startGame('arena'));
  const waitStance = (c) => page.waitForFunction((v) => Math.abs(window.__docao.player.crouch - v) < 1e-3, c, { timeout: 120000 });
  await page.keyboard.down('ControlLeft'); await waitStance(1);
  const camera = await page.evaluate(() => { const g = window.__docao; return g.camera.position.y - g.player.pos.y; });
  assert.ok(camera >= 1.04 - 1e-6 && camera <= 1.1, `câmera agachada: ${camera}`);
  console.log('OK Ctrl esquerdo abaixa personagem e câmera');
  await page.keyboard.down('ControlRight'); await page.keyboard.up('ControlLeft');
  assert.equal(await page.evaluate(() => window.__docao.player.crouch), 1);
  await page.keyboard.up('ControlRight'); await waitStance(0);
  console.log('OK ambos os Controls funcionam; soltar os dois levanta');
  await page.keyboard.down('ControlRight'); await waitStance(1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await waitStance(0);
  await page.keyboard.up('ControlRight');
  console.log('OK perder foco libera agachamento');

  if (SERVER) {
    const api = SERVER.replace(/^ws/, 'http');
    const r = await fetch(api + '/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ map: 'arena', max: 2, fillBots: false }) });
    assert.equal(r.status, 200); const { code } = await r.json();
    const messages = [];
    peer = new WebSocket(`${SERVER}/ws/${code}?name=Observador&skin=classico&primary=0`);
    peer.addEventListener('message', ({ data }) => { if (data !== 'pong') messages.push(JSON.parse(data)); });
    const until = async (fn) => { const end = Date.now() + 120000; while (Date.now() < end) { if (fn()) return; await new Promise((r) => setTimeout(r, 100)); } throw new Error('Timeout no protocolo online'); };
    await until(() => messages.some((m) => m.t === 'welcome'));
    const id = messages.find((m) => m.t === 'welcome').id;
    await page.evaluate((code) => { const g = window.__docao; g.endGame(); g.joinRoom(code); }, code);
    await page.waitForFunction(() => window.__docao.online?.myId > 0, null, { timeout: 120000 });
    peer.send(JSON.stringify({ t: 'start', map: 'arena' }));
    await page.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player?.alive && window.__docao.online?.inMatch, null, { timeout: 120000 });
    await page.keyboard.down('ControlLeft'); await waitStance(1);
    const localId = await page.evaluate(() => window.__docao.online.myId);
    await until(() => messages.some((m) => m.t === 's' && m.e.some((e) => e[0] === localId && e[10] === 1)));
    console.log('OK postura do teclado chega ao snapshot do servidor');
    await page.keyboard.up('ControlLeft'); await waitStance(0);
    await until(() => messages.some((m) => m.t === 's' && m.e.some((e) => e[0] === id)));
    const spawn = messages.filter((m) => m.t === 's').flatMap((m) => m.ev).find((ev) => ev[0] === 'sp' && ev[1] === id);
    assert.ok(spawn, 'spawn do observador recebido');
    // Jogador remoto real: atualiza sua postura pelo protocolo do servidor.
    for (let i = 1; i <= 5; i++) {
      await new Promise((r) => setTimeout(r, 60));
      peer.send(JSON.stringify({ t: 'u', sq: spawn[5], p: spawn[2], v: [0, 0, 0], g: 1, c: Math.min(1, i / 4) }));
    }
    await page.waitForFunction((id) => {
      const e = window.__docao.online.ents.get(id);
      return e?.crouch > 0.99 && Math.abs(e.model.group.scale.y - 0.65) < 1e-3 && e.model.legs[0].rotation.x > 0.6;
    }, id, { timeout: 120000 });
    console.log('OK outro jogador recebe a animação agachada, com pernas dobradas');
  }
  assert.deepEqual(errors, [], 'sem erros JavaScript no navegador');
  console.log('TUDO OK');
} finally {
  peer?.close();
  await browser.close();
}
