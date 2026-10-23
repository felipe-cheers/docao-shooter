// ============================================================
//  Loja e visual personalizado (Torresmos). TUDO autoritativo aqui: saldo, ganho, compra, mochila e o que pode ser equipado.
//  O cliente só pede ("quero comprar h3", "quero usar este visual"); nunca informa saldo nem ganho.
//  Custo D1: ganho = 1 UPDATE por jogador junto do lote de estatísticas (fim de partida/saída); compra = 1 lote atômico;
//  equipar = 1 UPDATE condicional (não grava se nada mudou); mochila vai junto do /api/me (1 SELECT pequeno), sem polling.
// ============================================================
import { SKINS, skinOk } from '../../skins.js';
import { ITEMS, itemById, parseLook, lookItemIds, EARN } from '../../shared/closet.js';

const now = () => Math.floor(Date.now() / 1000);
export const dayNow = () => Math.floor(now() / 86400);

// instrução SQL do ganho: soma `c` Torresmos respeitando o teto diário (atômico, uma linha). Entra no mesmo lote do ranking.
export function coinCreditStmt(env, acct, c) {
  c = Math.max(0, Math.min(EARN.matchCap, c | 0)); if (!c) return null;
  const day = dayNow();
  return env.DB.prepare(
    `UPDATE accounts SET
       coins = coins + MAX(0, MIN(?3, ?4 - (CASE WHEN earn_day = ?2 THEN earn_today ELSE 0 END))),
       earn_today = (CASE WHEN earn_day = ?2 THEN earn_today ELSE 0 END) + MAX(0, MIN(?3, ?4 - (CASE WHEN earn_day = ?2 THEN earn_today ELSE 0 END))),
       earn_day = ?2
     WHERE id = ?1`).bind(acct, day, c, EARN.dayCap);
}

export async function wallet(env, id) { // saldo + mochila + quanto já ganhou hoje
  const [a, inv] = await env.DB.batch([
    env.DB.prepare('SELECT coins, custom, earn_day, earn_today FROM accounts WHERE id = ?').bind(id),
    env.DB.prepare('SELECT item FROM inventory WHERE account_id = ?').bind(id),
  ]);
  const r = (a.results && a.results[0]) || { coins: 0, custom: null, earn_day: 0, earn_today: 0 };
  return { coins: r.coins | 0, custom: r.custom && parseLook(r.custom) ? r.custom : null, items: (inv.results || []).map((x) => x.item).filter((i) => itemById(i)), earnToday: r.earn_day === dayNow() ? r.earn_today | 0 : 0, dayCap: EARN.dayCap };
}

// compra: erro amigável por pré-leitura, segurança por lote atômico (INSERT condicional + débito condicional; chave primária barra compra dupla)
export async function buyItem(env, id, itemId) {
  const it = typeof itemId === 'string' ? itemById(itemId) : null; if (!it) return { status: 400, error: 'Item inexistente' };
  const t = now();
  const [a, inv] = await env.DB.batch([
    env.DB.prepare('SELECT coins FROM accounts WHERE id = ?').bind(id),
    env.DB.prepare('SELECT 1 AS x FROM inventory WHERE account_id = ? AND item = ?').bind(id, it.id),
  ]);
  if (inv.results && inv.results.length) return { status: 409, error: 'Você já tem esse item' };
  if (((a.results && a.results[0] && a.results[0].coins) | 0) < it.price) return { status: 402, error: 'Torresmos insuficientes' };
  try {
    const out = await env.DB.batch([
      env.DB.prepare('INSERT INTO inventory (account_id, item, acquired_at) SELECT ?1, ?2, ?3 WHERE (SELECT coins FROM accounts WHERE id = ?1) >= ?4').bind(id, it.id, t, it.price),
      env.DB.prepare('UPDATE accounts SET coins = coins - ?3 WHERE id = ?1 AND coins >= ?3 AND EXISTS (SELECT 1 FROM inventory WHERE account_id = ?1 AND item = ?2)').bind(id, it.id, it.price),
      env.DB.prepare('SELECT coins FROM accounts WHERE id = ?').bind(id),
    ]);
    if (!out[0].meta || !out[0].meta.changes) return { status: 402, error: 'Torresmos insuficientes' }; // perdeu a corrida pelo saldo
    return { status: 200, item: it.id, coins: (out[2].results[0].coins) | 0 };
  } catch (e) {
    return { status: 409, error: 'Você já tem esse item' }; // chave primária: outra compra igual entrou primeiro (nada foi cobrado: o lote voltou atrás)
  }
}

// equipar: skin da lista (sempre pode) ou visual personalizado cujas partes estão TODAS na mochila. Só grava se mudou.
export async function equipSkin(env, id, skin) {
  if (typeof skin !== 'string') return false;
  if (SKINS.some((s) => s.id === skin)) {
    await env.DB.prepare('UPDATE accounts SET skin = ?2 WHERE id = ?1 AND skin IS NOT ?2').bind(id, skin).run(); return true;
  }
  if (!skinOk(skin)) return false;
  const ids = lookItemIds(skin);
  const ph = ids.map((_, i) => '?' + (i + 3)).join(',');
  const own = ids.length ? `(SELECT COUNT(*) FROM inventory WHERE account_id = ?1 AND item IN (${ph})) = ${ids.length}` : '1 = 1';
  const r = await env.DB.prepare(`UPDATE accounts SET skin = ?2, custom = ?2 WHERE id = ?1 AND (skin IS NOT ?2 OR custom IS NOT ?2) AND ${own}`).bind(id, skin, ...ids).run();
  if (r.meta && r.meta.changes) return true;
  const cur = await env.DB.prepare('SELECT skin, custom FROM accounts WHERE id = ?').bind(id).first(); // nada mudou: ou já estava assim, ou faltou item
  return !!cur && cur.skin === skin && cur.custom === skin;
}
export { ITEMS };
