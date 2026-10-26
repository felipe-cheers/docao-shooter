// Saldo inicial de Docoin (sem navegador, sem wrangler): conta nova nasce com START_COINS;
// a migração 0004 soma o mesmo valor uma vez em cada conta que já existia, sem zerar o que tinha.
// Uso: node test-saldo-inicial.mjs
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { START_COINS } from './shared/closet.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

ok(START_COINS === 500, `saldo inicial é 500 Docoin (${START_COINS})`);

const mig = read('./server/migrations/0004_saldo_inicial.sql');
const stmt = mig.replace(/--.*$/gm, '').trim();
ok(/^UPDATE\s+accounts\s+SET\s+coins\s*=\s*coins\s*\+\s*500\s*;?$/i.test(stmt), 'migração 0004 só soma 500 ao saldo (não reescreve)');
ok(!/\b(DELETE|DROP|TRUNCATE)\b/i.test(stmt), 'migração não apaga conta nem tabela');

const auth = read('./server/src/auth.js');
ok(/INSERT INTO accounts \(nick, nick_key, pass_hash, created_at, coins\)/.test(auth) && /START_COINS/.test(auth), 'cadastro grava coins com START_COINS');

const db = new DatabaseSync(':memory:');
for (const f of ['0001_contas.sql', '0002_loja.sql', '0003_desafios.sql']) db.exec(read('./server/migrations/' + f));
const ins = db.prepare('INSERT INTO accounts (nick, nick_key, pass_hash, created_at, coins) VALUES (?, ?, ?, ?, ?)');
ins.run('Velha', 'velha', 'x', 1, 0);
ins.run('Rica', 'rica', 'x', 1, 120);
db.exec(mig);
const coins = (nick) => db.prepare('SELECT coins FROM accounts WHERE nick = ?').get(nick).coins;
ok(coins('Velha') === START_COINS && coins('Rica') === 120 + START_COINS, `contas existentes: 0→${coins('Velha')} e 120→${coins('Rica')} (soma, saldo anterior fica)`);

ins.run('Nova', 'nova', 'x', 2, START_COINS);
ok(coins('Nova') === START_COINS && coins('Rica') === 620, `conta criada depois da migração fica em ${coins('Nova')} e a antiga não ganha de novo`);

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
