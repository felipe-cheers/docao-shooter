// Itens novos da loja (sem navegador): fantasia completa é exclusiva, dança não entra no código do visual, todas as peças usam partes que já existem.
// Uso: node test-loja-itens.mjs
import { ITEMS, SLOTS, encodeLook, parseLook, lookToSkin, itemById, danceItems, itemForDance } from './shared/closet.js';
import { DANCE_IDS, FREE_DANCES, PAID_DANCES, danceId } from './shared/emote.js';
import { normDance, isPaidDance, ALL_DANCES } from './victory-dance.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
ok(new Set(ITEMS.map((i) => i.id)).size === ITEMS.length, 'ids únicos');
ok(ITEMS.every((i) => i.price > 0 && Number.isInteger(i.price)), 'todo item tem preço inteiro');
ok(SLOTS[0][0] === 'c' && ITEMS.filter((i) => i.slot === 'c').length === 8, '8 fantasias completas no slot c');
ok(ITEMS.filter((i) => i.slot === 'h').length === 17, '17 itens de cabeça (7 antigos + 10 novos)');
ok(danceItems().length === 6 && danceItems().every((i) => PAID_DANCES.includes(i.dance)), '6 danças pagas ligadas a ids de shared/emote.js');
ok(FREE_DANCES.join() === 'moonwalk,mewing,sixseven' && DANCE_IDS.length === 9, 'as 3 danças grátis continuam as mesmas');
ok(PAID_DANCES.every((d) => itemForDance(d) && isPaidDance(d) && normDance(d) === d && danceId(d) === d), 'dança paga é reconhecida no cliente e no servidor');
ok(!isPaidDance('moonwalk') && normDance('xyz') === 'moonwalk' && ALL_DANCES.length === 9, 'grátis não é paga; id estranho cai no Moonwalk');
ok(encodeLook({ shirt: 1, pants: 2, items: { c: 'c1', h: 'h1' } }) === 'x1.1.2.c1', 'fantasia no visual descarta as outras partes');
ok(parseLook('x1.1.2.c1.h1') === null, 'servidor recusa código com fantasia + outra parte');
ok(parseLook('x1.1.2.d1') === null, 'dança não é parte de visual (código recusado)');
const sk = lookToSkin(parseLook('x1.1.2.c8'));
ok(sk && sk.float === true && sk.custom === true && sk.name === itemById('c8').name, 'fantasia vira skin no formato de skins.js (Docão Dourado flutua)');
ok(parseLook('x1.1.2.h17') && parseLook('x1.1.2.h8.f1'), 'chapéus novos combinam com outras partes');
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
