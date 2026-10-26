// Itens novos da loja (sem navegador): fantasia completa é exclusiva, dança não entra no código do visual, todas as peças usam partes que já existem.
// Uso: node test-loja-itens.mjs
import { ITEMS, SLOTS, encodeLook, parseLook, lookToSkin, itemById, itemPrice, isFreeItem, priceOfLook, danceItems, itemForDance } from './shared/closet.js';
import { SKINS } from './skins.js';
import { DANCE_IDS, FREE_DANCES, PAID_DANCES, danceId } from './shared/emote.js';
import { normDance, isPaidDance, ALL_DANCES } from './victory-dance.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
ok(new Set(ITEMS.map((i) => i.id)).size === ITEMS.length, 'ids únicos');
ok(ITEMS.filter((i) => !i.free).every((i) => i.price > 0 && Number.isInteger(i.price)), 'item pago tem preço inteiro (os de graça ficam de fora)');
ok(SLOTS[0][0] === 'c' && ITEMS.filter((i) => i.slot === 'c').length === 9, '9 fantasias completas no slot c');
const paid = { h1: 60, c1: 900, c8: 1500, d8: 400, b3: 100 };
ok(Object.entries(paid).every(([id, p]) => itemPrice(id) === p), 'preço dos itens que já existiam não mudou');
ok(isFreeItem('c9') && itemPrice('c9') === 0 && itemById('c9').free === true && !isFreeItem('c1') && !isFreeItem('h1'), 'Faixa Presidencial é grátis; fantasia e parte pagas continuam pagas');
ok(priceOfLook(encodeLook({ shirt: 0, pants: 12, items: { c: 'c9' } }), []) === 0, 'equipar a faixa não custa Docoin mesmo com a mochila vazia');
const faixa = lookToSkin(parseLook(encodeLook({ shirt: 4, pants: 5, items: { c: 'c9' } })));
ok(faixa && faixa.name === 'Faixa Presidencial' && faixa.parts.some((p) => p.type === 'faixa') && faixa.shirt.color === '#2c333c', 'código da faixa vira a fantasia completa (a cor da paleta não troca o terno)');
ok(SKINS.some((s) => s.id === 'faixa-presidencial' && s.name === 'Faixa Presidencial' && (s.parts || []).some((p) => p.type === 'faixa')), 'a faixa também está na lista de skins (padrão, sem compra)');
ok(ITEMS.filter((i) => i.slot === 'h').length === 17, '17 itens de cabeça (7 antigos + 10 novos)');
ok(danceItems().length === 8 && danceItems().every((i) => PAID_DANCES.includes(i.dance)), '8 danças pagas ligadas a ids de shared/emote.js');
ok(FREE_DANCES.join() === 'moonwalk,mewing,sixseven' && DANCE_IDS.length === 11, 'as 3 danças grátis continuam as mesmas');
ok(PAID_DANCES.every((d) => itemForDance(d) && isPaidDance(d) && normDance(d) === d && danceId(d) === d), 'dança paga é reconhecida no cliente e no servidor');
ok(!isPaidDance('moonwalk') && normDance('xyz') === 'moonwalk' && ALL_DANCES.length === 11, 'grátis não é paga; id estranho cai no Moonwalk');
ok(encodeLook({ shirt: 1, pants: 2, items: { c: 'c1', h: 'h1' } }) === 'x1.1.2.c1', 'fantasia no visual descarta as outras partes');
ok(parseLook('x1.1.2.c1.h1') === null, 'servidor recusa código com fantasia + outra parte');
ok(parseLook('x1.1.2.d1') === null, 'dança não é parte de visual (código recusado)');
const sk = lookToSkin(parseLook('x1.1.2.c8'));
ok(sk && sk.float === true && sk.custom === true && sk.name === itemById('c8').name, 'fantasia vira skin no formato de skins.js (Docão Dourado flutua)');
ok(parseLook('x1.1.2.h17') && parseLook('x1.1.2.h8.f1'), 'chapéus novos combinam com outras partes');
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
