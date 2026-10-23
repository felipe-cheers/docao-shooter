// ============================================================
//  ATELIÊ DO DOCÃO: partes de skin à venda (moeda do jogo: Torresmos) e "visual personalizado".
//  Só dados e funções puras: o cliente (prévia, loja) e o Worker (validação, compra, equipar) usam este mesmo arquivo.
//  O visual personalizado vira um CÓDIGO curto de texto (ex.: "x1.3.5.h3.f2.s1") que viaja pela rede no lugar do id da skin.
//  Cores da camiseta e do shorts são grátis (paleta fixa). As PARTES custam Torresmos e só podem ser usadas se estiverem na mochila (D1).
//  As peças 3D são as que já existem em costumes.js/docao.js, só com cores novas: nada de modelo novo, nada de alterar skins atuais.
// ============================================================
export const CURRENCY = 'Torresmos';
export const COLORS = ['#d8261c', '#e8702a', '#f2c94c', '#6fbf3b', '#17b394', '#2b8fd8', '#1446b8', '#7a3fb5', '#e66fa8', '#f4f4f4', '#8a8a8a', '#2c2c30', '#1d1410', '#7a4a24'];
export const SLOTS = [['h', 'Cabeça'], ['f', 'Rosto'], ['n', 'Pescoço'], ['b', 'Corpo'], ['w', 'Cintura'], ['g', 'Mãos'], ['s', 'Pés']];
// id = letra do espaço + número. price em Torresmos. part = peça 3D (type + opções) já existente no modelo do Docão.
export const ITEMS = [
  { id: 'h1', name: 'Boné do Churrasqueiro', emoji: '🧢', price: 60, part: { type: 'cap', color: '#d8261c', brim: '#7d1f19' } },
  { id: 'h2', name: 'Boné Verde Granja', emoji: '🧢', price: 60, part: { type: 'cap', color: '#203e35', brim: '#12261f' } },
  { id: 'h3', name: 'Fedora do Mafioso do Chiqueiro', emoji: '🎩', price: 150, part: { type: 'fedora', color: '#15151a', band: '#d8261c' } },
  { id: 'h4', name: 'Chapéu de Pescador de Linguiça', emoji: '🎣', price: 110, part: { type: 'bucketHat', color: '#8a8a5c', band: '#5a5a38' } },
  { id: 'h5', name: 'Gorro do Inverno Sulista', emoji: '🧶', price: 90, part: { type: 'roundCap', color: '#2a6f4a', knot: '#f2c94c' } },
  { id: 'h6', name: 'Cabeleira de Roqueiro', emoji: '🎸', price: 180, part: { type: 'longHair', color: '#3b2414' } },
  { id: 'h7', name: 'Cabeleira Pimenta com Faixa', emoji: '🌶️', price: 200, part: { type: 'longHair', color: '#b3261e', headband: '#f4f4f4' } },
  { id: 'f1', name: 'Óculos de Intelectual', emoji: '👓', price: 50, part: { type: 'glasses', color: '#15151a' } },
  { id: 'f2', name: 'Óculos Escuros de Churrasco', emoji: '🕶️', price: 90, part: { type: 'sunglasses', color: '#15151a', lens: '#1a1a1a' } },
  { id: 'f3', name: 'Óculos Quadrado de Dev', emoji: '🤓', price: 70, part: { type: 'squareGlasses', color: '#121214' } },
  { id: 'f4', name: 'Bigode de Açougueiro', emoji: '🥩', price: 80, part: { type: 'beard', color: '#43291a' } },
  { id: 'f5', name: 'Óculos Radical Azul', emoji: '😎', price: 120, part: { type: 'sunglasses', color: '#d8261c', lens: '#5ad1ff' } },
  { id: 'n1', name: 'Corrente de Porco Rico', emoji: '💰', price: 250, part: { type: 'chain', color: '#d4a82a' } },
  { id: 'n2', name: 'Cachecol Vermelho e Branco', emoji: '🧣', price: 70, part: { type: 'scarf', colors: ['#d8261c', '#f4f4f4'] } },
  { id: 'n3', name: 'Bandana do Churrasco', emoji: '🏴‍☠️', price: 55, part: { type: 'bandana', color: '#d8261c' } },
  { id: 'n4', name: 'Cordão de Crachá', emoji: '🪪', price: 65, part: { type: 'lanyard', color: '#2b5c8a', logo: '#2b5c8a' } },
  { id: 'n5', name: 'Lenço do Deserto', emoji: '🏜️', price: 80, part: { type: 'desertScarf', color: '#c9ad78' } },
  { id: 'b1', name: 'Colete de Pescador', emoji: '🦺', price: 120, part: { type: 'vest', color: '#8a8a5c', pocket: '#5a5a38' } },
  { id: 'b2', name: 'Dragonas Douradas', emoji: '🎖️', price: 130, part: { type: 'epaulettes', color: '#d4a82a' } },
  { id: 'b3', name: 'Faixa Larga do Peão', emoji: '🤠', price: 100, part: { type: 'sash', color: '#6b4a2a', belt: '#3a2412', buckle: '#d4a82a' } },
  { id: 'b4', name: 'Faixas de Lutador', emoji: '🥊', price: 60, part: { type: 'armWraps', color: '#f4f4f4' } },
  { id: 'b5', name: 'Jaqueta Bufante Azul', emoji: '🧥', price: 220, part: { type: 'puffer', color: '#2b5c8a', zipper: '#f4f4f4' } },
  { id: 'w1', name: 'Varinha do Chef', emoji: '🪄', price: 120, part: { type: 'wand', color: '#6b4a2a' } },
  { id: 'w2', name: 'Peixe de Cinto', emoji: '🐟', price: 90, part: { type: 'fish', color: '#2b8fd8' } },
  { id: 'w3', name: 'Espeto Laser Verde', emoji: '⚔️', price: 300, part: { type: 'laserSword', blade: '#7dff6a' } },
  { id: 'g1', name: 'Luvas Brancas', emoji: '🧤', price: 70, part: { type: 'glove', hand: 'both', color: '#f4f4f4' } },
  { id: 'g2', name: 'Luvas Pretas', emoji: '🧤', price: 70, part: { type: 'glove', hand: 'both', color: '#15151a' } },
  { id: 'g3', name: 'Luvas Brilhantes', emoji: '✨', price: 260, part: { type: 'glove', hand: 'both', color: '#f4f4f4', sparkle: true } },
  { id: 's1', name: 'Tênis do Torresmo', emoji: '👟', price: 80, part: { type: 'shoes', color: '#141416', sole: '#f4f4f4' } },
  { id: 's2', name: 'Botinha Vermelha', emoji: '🥾', price: 80, part: { type: 'shoes', color: '#7d1f19', sole: '#f2c94c' } },
  { id: 's3', name: 'Meiões Brancos', emoji: '🧦', price: 40, part: { type: 'socks', color: '#f4f4f4' } },
  { id: 's4', name: 'Tênis Azul Royal', emoji: '👟', price: 80, part: { type: 'shoes', color: '#1446b8', sole: '#f4f4f4' } },
];
for (const it of ITEMS) it.slot = it.id[0];
export const itemById = (id) => ITEMS.find((i) => i.id === id) || null;
export const itemPrice = (id) => { const i = itemById(id); return i ? i.price : 0; };

// ---------- visual personalizado ----------
export const LOOK_PREFIX = 'x1.';
const LOOK_RE = /^x1\.[0-9a-d]\.[0-9a-d](\.[a-z][0-9]{1,2}){0,8}$/;
export const DEFAULT_LOOK = { shirt: 0, pants: 12, items: {} }; // camiseta vermelha, shorts escuro (igual ao Clássico), sem partes
export const isLookCode = (s) => typeof s === 'string' && s.length <= 48 && LOOK_RE.test(s);
export function encodeLook(look) {
  const sh = Math.max(0, Math.min(COLORS.length - 1, look.shirt | 0)), pn = Math.max(0, Math.min(COLORS.length - 1, look.pants | 0));
  const its = SLOTS.map(([k]) => look.items && look.items[k]).filter((id) => id && itemById(id));
  return LOOK_PREFIX + sh.toString(16) + '.' + pn.toString(16) + its.map((i) => '.' + i).join('');
}
// Devolve { shirt, pants, items:{slot:id} } ou null se o código for inválido (formato, cor fora da paleta, item inexistente, dois itens no mesmo espaço).
export function parseLook(code) {
  if (!isLookCode(code)) return null;
  const f = code.split('.'); const shirt = parseInt(f[1], 16), pants = parseInt(f[2], 16);
  if (!(shirt < COLORS.length) || !(pants < COLORS.length)) return null;
  const items = {};
  for (const id of f.slice(3)) { const it = itemById(id); if (!it || items[it.slot]) return null; items[it.slot] = id; }
  if (encodeLook({ shirt, pants, items }) !== code) return null; // só a forma canônica (ordem dos espaços fixa)
  return { shirt, pants, items };
}
export const lookItemIds = (code) => { const l = parseLook(code); return l ? Object.values(l.items) : []; };
// Skin pronta pro modelo (mesmo formato de skins.js). O id é o próprio código.
export function lookToSkin(code) {
  const l = typeof code === 'string' ? parseLook(code) : code; if (!l) return null;
  const parts = Object.values(l.items).map((id) => ({ ...itemById(id).part }));
  return { id: typeof code === 'string' ? code : encodeLook(l), name: 'Visual personalizado', custom: true,
    shirt: { color: COLORS[l.shirt], trim: '#1d1410', logo: { text: 'C!', color: '#f5e6d0' } }, pants: COLORS[l.pants], parts };
}
export const priceOfLook = (code, owned = []) => lookItemIds(code).filter((i) => !owned.includes(i)).reduce((s, i) => s + itemPrice(i), 0);

// ---------- ganho de Torresmos (regras; quem aplica é o servidor) ----------
export const EARN = {
  killHuman: 2, killBot: 1,        // por abate (adversário humano / bot ou zumbi)
  finish: 10, win: 15,             // fim de partida jogada (>= minSecs) e vitória
  invWave: 3, invWin: 25,          // Invasão: por wave alcançada e vitória
  minSecs: 60,                     // partida precisa ter durado isso pra o jogador ganhar bônus de fim
  matchCap: 80,                    // máximo por partida
  dayCap: 400,                     // máximo por dia (dia UTC) por conta
};
