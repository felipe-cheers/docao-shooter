// ============================================================
//  Ateliê do Docão (menu): personalizador de visual + loja de partes, com prévia 3D própria (um mini renderizador que só
//  existe com a janela aberta). Nada aqui decide saldo, preço ou posse: o servidor decide, a tela só pede e mostra.
//  Convidado não salva nem compra (a janela só convida a entrar na conta).
// ============================================================
import * as THREE from 'three';
import { makeDocao } from './docao.js';
import './costumes.js';
import { getAccount, getItems, getEarn, onAccount, refreshStats, equipLook, buyItem } from './account.js';
import { COLORS, SLOTS, ITEMS, CURRENCY, DEFAULT_LOOK, encodeLook, parseLook, itemById } from './shared/closet.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let look = { ...DEFAULT_LOOK, items: {} }, tab = 'look', trial = null, busy = false, three = null, raf = 0;

const currentCode = () => { const items = { ...look.items }; if (trial) items[trial.slot] = trial.id; return encodeLook({ shirt: look.shirt, pants: look.pants, items }); };
const msg = (t, ok = false) => { const m = $('closetMsg'); m.textContent = t || ''; m.style.color = ok ? '#2a6f4a' : ''; };

// ---------- prévia 3D ----------
function startThree() {
  if (three) return;
  const canvas = $('closetCanvas'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(260, 330, false);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 260 / 330, 0.1, 50); cam.position.set(0, 1.25, 5.2); cam.lookAt(0, 1.0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8f7a55, 1.8)); const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 3, 3); scene.add(sun);
  three = { renderer, scene, cam, model: null, code: '', yaw: 0.35 };
}
function showModel() {
  if (!three) return; const code = currentCode(); if (three.code === code && three.model) return;
  if (three.model) three.scene.remove(three.model.group); three.code = code;
  three.model = makeDocao(code, { withGun: false, pose: 'idle' }); three.scene.add(three.model.group);
}
function loop() {
  if (!three || $('closetModal').classList.contains('hidden')) { raf = 0; return; }
  three.yaw += 0.012; if (three.model) three.model.group.rotation.y = three.yaw; three.renderer.render(three.scene, three.cam); raf = requestAnimationFrame(loop);
}
function stopThree() { if (raf) cancelAnimationFrame(raf); raf = 0; } // o renderizador fica (criado uma vez) e só o laço de desenho para; perder o contexto WebGL e recriar na mesma tela dá erro

// ---------- telas ----------
function renderWallet() {
  const a = getAccount(), e = getEarn(); if (!a) return;
  $('closetWallet').innerHTML = `🥓 <b>${a.coins | 0}</b> ${CURRENCY}<small>Ganho hoje: ${e.today | 0}/${e.cap | 0} · só jogando</small>`;
}
function renderLook() {
  const owned = new Set(getItems());
  const sw = (key, val) => COLORS.map((c, i) => `<button type="button" class="closet-sw${val === i ? ' on' : ''}" data-${key}="${i}" style="background:${c}" aria-label="Cor ${i + 1}"></button>`).join('');
  let h = `<div class="closet-slot"><h4>Camiseta</h4><div class="closet-chips">${sw('shirt', look.shirt)}</div></div><div class="closet-slot"><h4>Shorts</h4><div class="closet-chips">${sw('pants', look.pants)}</div></div>`;
  for (const [k, name] of SLOTS) {
    const mine = ITEMS.filter((i) => i.slot === k && owned.has(i.id));
    h += `<div class="closet-slot"><h4>${name}</h4><div class="closet-chips"><button type="button" data-slot="${k}" data-item=""${!look.items[k] ? ' class="on"' : ''}>Nada</button>${mine.map((i) => `<button type="button" data-slot="${k}" data-item="${i.id}"${look.items[k] === i.id ? ' class="on"' : ''}>${i.emoji} ${esc(i.name)}</button>`).join('')}${mine.length ? '' : '<span class="closet-note">Nada na mochila ainda. Veja a Loja!</span>'}</div></div>`;
  }
  h += '<button type="button" id="closetSave" class="ticket-btn">SALVAR E USAR ESTE VISUAL</button><p class="closet-note">As skins da lista continuam no menu. O visual salvo vale nas partidas online com conta.</p>';
  $('closetLook').innerHTML = h;
}
function renderShop() {
  const owned = new Set(getItems()), a = getAccount(), coins = a ? a.coins | 0 : 0;
  let h = `<p class="closet-note">Como ganhar ${CURRENCY}: abates, fim de partida, vitória e waves da Invasão, em partidas <b>online com conta</b>. Treino não rende. Não dá pra comprar com dinheiro de verdade.</p>`;
  for (const [k, name] of SLOTS) {
    h += `<div class="closet-sec"><h4>${name}</h4><div class="closet-grid">` + ITEMS.filter((i) => i.slot === k).map((i) => {
      const has = owned.has(i.id), can = coins >= i.price;
      return `<div class="closet-card${trial && trial.id === i.id ? ' try' : ''}" data-try="${i.id}"><b>${i.emoji} ${esc(i.name)}</b><div class="price">🥓 ${i.price}</div><button type="button" data-buy="${i.id}"${has || !can ? ' disabled' : ''}>${has ? 'NA MOCHILA' : can ? 'COMPRAR' : 'FALTAM ' + (i.price - coins)}</button></div>`;
    }).join('') + '</div></div>';
  }
  $('closetShop').innerHTML = h;
}
function render() {
  const a = getAccount(); $('closetGuest').classList.toggle('hidden', !!a); $('closetMain').classList.toggle('hidden', !a);
  if (!a) return; renderWallet(); renderLook(); renderShop();
  $('closetLook').classList.toggle('hidden', tab !== 'look'); $('closetShop').classList.toggle('hidden', tab !== 'shop');
  $('closetTabLook').classList.toggle('active', tab === 'look'); $('closetTabShop').classList.toggle('active', tab === 'shop');
  showModel();
}
function setTab(t) { tab = t; if (t === 'look') trial = null; msg(''); render(); }

function loadLookFromAccount() {
  const a = getAccount(), p = a && (parseLook(a.custom) || parseLook(a.skin)); const owned = new Set(getItems());
  look = p ? { shirt: p.shirt, pants: p.pants, items: Object.fromEntries(Object.entries(p.items).filter(([, id]) => owned.has(id))) } : { ...DEFAULT_LOOK, items: {} };
}
export function openCloset() {
  trial = null; msg(''); tab = 'look'; $('closetModal').classList.remove('hidden');
  if (getAccount()) { loadLookFromAccount(); startThree(); render(); if (!raf) raf = requestAnimationFrame(loop); refreshStats().then(() => { if (!$('closetModal').classList.contains('hidden')) { loadLookFromAccount(); render(); } }); }
  else render();
}
function closeCloset() { $('closetModal').classList.add('hidden'); trial = null; stopThree(); }

async function onClick(e) {
  const t = e.target; if (busy) return;
  const sw = t.closest('[data-shirt],[data-pants]');
  if (sw) { if (sw.dataset.shirt !== undefined) look.shirt = +sw.dataset.shirt; else look.pants = +sw.dataset.pants; msg(''); render(); return; }
  const sl = t.closest('button[data-slot]');
  if (sl) { if (sl.dataset.item) look.items[sl.dataset.slot] = sl.dataset.item; else delete look.items[sl.dataset.slot]; msg(''); render(); return; }
  if (t.closest('#closetSave')) {
    busy = true; msg('Salvando…'); const r = await equipLook(encodeLook(look)); busy = false;
    if (r.error) msg(r.error); else { msg('Visual salvo! Ele já está valendo. 🐷', true); document.dispatchEvent(new CustomEvent('docao-look-saved')); } return;
  }
  const buy = t.closest('button[data-buy]');
  if (buy) {
    busy = true; buy.disabled = true; const it = itemById(buy.dataset.buy); const r = await buyItem(buy.dataset.buy); busy = false;
    if (r.error) msg(r.error); else { msg(`Comprou: ${it.name}! Já está na sua mochila.`, true); look.items[it.slot] = it.id; trial = null; }
    render(); return;
  }
  const card = t.closest('[data-try]');
  if (card) { const it = itemById(card.dataset.try); trial = trial && trial.id === it.id ? null : { id: it.id, slot: it.slot }; msg(trial ? 'Prévia (ainda não é seu). Clique de novo pra tirar.' : ''); render(); }
}

export function initCloset() {
  $('closetBtn').onclick = openCloset; $('closetClose').onclick = closeCloset;
  $('closetLogin').onclick = () => { closeCloset(); $('acctBtn').click(); };
  $('closetTabLook').onclick = () => setTab('look'); $('closetTabShop').onclick = () => setTab('shop');
  $('closetModal').addEventListener('click', onClick);
  $('closetModal').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeCloset(); });
  $('closetModal').addEventListener('mousedown', (e) => e.stopPropagation());
  onAccount((a) => { if (!a && !$('closetModal').classList.contains('hidden')) { stopThree(); render(); } else if (a && !$('closetModal').classList.contains('hidden') && !busy) { renderWallet(); renderShop(); } });
}
