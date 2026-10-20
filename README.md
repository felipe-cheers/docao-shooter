# Docão Shooter 🐷🔫

Jogo de tiro em primeira pessoa no navegador, com o Docão (mascote da Cheers) no lugar dos ovos.
Feito do zero com Three.js (arte procedural, sons sintetizados via WebAudio). Nenhum código, arte, nome ou áudio de terceiros.

## Rodar
```
cd docao-game
python3 -m http.server 8123
# abra http://localhost:8123
```
(Precisa ser servido por HTTP por causa dos módulos ES; funciona offline, o Three.js está em `vendor/`.)

## Controles
WASD mover · Mouse mirar · Espaço pular · Shift mirar/zoom (luneta no Sniper) · Clique atirar · R recarregar · 1 primária / 2 pistola (ou rodinha) · Segure Q (ou 3): Copo Bomba, solte para arremessar · Morto: 1–4 escolhe a primária do próximo renascimento · Tab placar · Esc (ou P) pausar

## Mira com zoom (Shift)

- **Segure Shift** para mirar; solte para voltar ao normal. Shift não faz mais nada no jogo (não há corrida).
- O zoom entra suave em ~0,15 s: FOV 75° → **40°** Fuzil Pururuca, **55°** Calibre 12, **15°** Sniper Torresmo (luneta), **55°** Bazuca do Chiqueiro, **50°** Pistolinha Leitão.
- Mirando: sensibilidade do mouse cai na proporção do FOV, dispersão bem menor (fuzil ~12% da normal, Calibre 12 ~60%, pistola ~40%), andar a 60% da velocidade, arma vai para o centro/levantada, vinheta suave nas bordas e mira menor.
- **Recarregar ou trocar de arma cancela o zoom**; se Shift continuar pressionado, o zoom volta sozinho quando termina.
- Dá para segurar Q (Copo Bomba) junto com Shift normalmente. Bots não são afetados.

## Armas e loadout (estilo "uma primária + pistola")

Escolha **uma arma primária** no menu (ao lado das skins; fica salva no navegador). Morreu? Na tela de morte aperte **1–4**
(ou clique) para trocar a primária — vale no próximo renascimento. Todo mundo leva a **Pistolinha Leitão** como secundária
e o **Copo Bomba** (tecla Q ou 3). **1** = primária, **2** = pistola, a rodinha alterna entre as duas.

| Arma | Tipo | Pente/reserva | Dano | Cadência | Recarga | Zoom |
|---|---|---|---|---|---|---|
| **Fuzil Pururuca** | automático | 30/120 | 20 (cabeça 40) | 0,1 s | 1,6 s | 40° |
| **Escopeta Chiqueiro · Calibre 12** | pump, 8 bagos | 8/32 | 8×15 de perto (cabeça ×1,5), cai até 30% a 30 m | 0,8 s (pump) | cartucho a cartucho (0,45 s cada) — **atirar interrompe** | 55° |
| **Sniper Torresmo** | ferrolho | 5/20 | 115 corpo / 250 cabeça (1 tiro mata) | 1,4 s (ferrolho) | 2,4 s | **luneta 15°** |
| **Bazuca do Chiqueiro** | foguete lento (24 m/s) com fumaça | 1/4 | até 120 em área (raio 5 m), 40% em si mesmo, empurrão | — | 2,5 s | 55° |
| **Pistolinha Leitão** (secundária) | semiautomática | 12/60 | 25 (cabeça 50) | 0,16 s | 1,1 s | 50° |

- **Sniper:** sem mira e andando é muito impreciso; com a luneta (Shift) **parado** é perfeito (andando com luneta, quase).
  A luneta é um overlay preto com retícula e a arma some da tela. Tiro alto com rastro grosso.
- **Bazuca:** o foguete tem ponta de focinho de porquinho e faixa “C!”; explode ao bater em parede, chão ou Docão.
  Atire no chão embaixo de você para um **rocket jump** (~2,5 m de altura, perde ~40 de vida).
- **Caixas de munição** enchem a reserva da primária e da pistola; para a bazuca dão só **+1 foguete** (munição escassa).
- **Bots** recebem uma primária aleatória (às vezes trocam ao renascer) + pistola e escolhem pela distância:
  Calibre 12 de perto (<14 m), Sniper de longe (≥9 m, com atraso extra de ~0,8 s pra mirar e remira a cada tiro, mirando no corpo),
  Bazuca a média distância (6–28 m, mira no pé com antecipação, nunca atira colado), pistola no resto.
- Nomes no feed de abates: Fuzil Pururuca, Calibre 12, Sniper Torresmo, Bazuca, Pistolinha, Copo Bomba.

## Copo Bomba (granada)

- Um copo de festa vermelho com o logo "C!" que explode em confete vermelho/ciano, espuma e cerveja.
- **Segure Q** para carregar a força (barra enche em ~1,2 s; um arco tracejado mostra a trajetória) e **solte Q** para arremessar.
- O copo voa em arco com gravidade, quica nas paredes/chão e explode ~2,5 s após o arremesso.
- Dano em área (raio 6 m, até 130 de dano com queda pela distância), empurrão e tremida de tela; pode matar. Dano em si mesmo é reduzido (40%).
- Máximo de 3 copos; você nasce com 1. Coletáveis de copo (flutuando, anel ciano) dão +1 e reaparecem após ~20 s.
- O HUD mostra 3 ícones de copo ao lado da munição. No feed de abates aparece como **[Copo Bomba]**.
- Bots também pegam copos e arremessam em alvos a média distância.


## Mapas (7)
Escolha no menu (cartão **Mapa** → grade com miniaturas aéreas, ou **Aleatório**: sorteia um mapa diferente a cada partida). A escolha fica salva no navegador. No fim da partida há **PRÓXIMO MAPA ▸** (segue a ordem da lista).

| Mapa | Ideia de fluxo (inspiração, só layout) | Destaques |
|---|---|---|
| **Arena da Fazendinha** | o mapa original | plataforma central, torres de canto, feno e caixotes |
| **Duas Pocilgas** | mapa clássico de bomba com dois bombsites (estilo Dust2) | praça A elevada, praça B com túnel coberto, corredor "LONGO" com portas, portas do "MEIO", passarela; areia e caixotes |
| **Celeiro Industrial** | galpão de dois níveis (estilo Nuke) | térreo + mezanino interno por rampa, telhado acessível por rampa externa, pátio com contêineres, silos e caminhão |
| **Mercadão** | ruas de mercado com becos e arcos (estilo Mirage/Inferno) | barracas com toldo, fonte central, dois arcos, sacadas com escada, telhado baixo, becos estreitos; paleta terracota |
| **Torres Gêmeas do Barril** | campo aberto simétrico com duas bases (estilo Blood Gulch / Facing Worlds) | duas torres de 3 níveis (vermelha e ciano), planaltos com ponte (dá pra passar por baixo), pedras e barris; bom pra sniper |
| **Vizinhança Cheers** | beco sem saída com duas casas frente a frente (estilo Nuketown) | casas de 2 andares com escada interna e janelas, ônibus e caminhão Cheers no meio da rua, carros, cercas; caos rápido |
| **Bar Cheers Noturno** | mapa compacto de vários níveis (estilo Shell Shockers / Shipment) | noite, neon ciano #7DF9FF e rosa, balcão em U, barris, copões vermelhos gigantes, palco com DJ, mezanino com 2 rampas |

Toda a geometria, os nomes e a arte são originais (nada copiado dos jogos citados).

**Como funciona**
- `maps.js` é só dados. Cada mapa tem:
  - `id`, `name`, `desc` e `size`;
  - `wallH`/`wallColor` e `palette` (céu, neblina, luz, chão, xadrez, nuvens/estrelas, luzes pontuais);
  - `boxes` e `props`;
  - `spawns`, `pickups` (`health`, `ammo` e `grenade` = Copo Bomba) e `waypoints` extras;
  - `showcase`/`view` e `test`.
- Para montar o layout há helpers: `B()` caixa, `R()` rampa, `wallX`/`wallZ` (paredes com `door()`/`win()`), `house()` (casa de 2 andares), `mirrorZ`/`rot180` (espelhar bases).
- `world.js` monta o mapa:
  - caixas mescladas em **uma malha por cor** e uma malha de contornos;
  - props: barril, copão, ônibus, caminhão, árvore, silo, barraca, toldo, placa, neon, estandarte, rua…;
  - a colisão dos props é AABB, com um proxy invisível para os tiros;
  - também gera as miniaturas do menu.
- Colisão: AABB completo com **teto**. Dá pra andar debaixo de lajes, mezaninos e pontes; quem pula ali bate a cabeça.
  - Grade de broadphase de 4 m.
  - O limite do mapa tem colisão alta, então ninguém sai nem com rocket jump.
- Bots (`nav.js`):
  - Um grafo de navegação é **gerado automaticamente** a partir da colisão, com amostragem a cada 2 m no chão e no topo de caixas/rampas e linha central das rampas.
  - Cada aresta é testada com uma "caminhada" simulada: degraus, quedas e pulos de até 1,25 m.
  - Os bots usam A* até o objetivo (vida, copo, último inimigo visto ou ponto aleatório), pegam atalhos quando dá pra ir reto e replanejam se travarem.
  - Se o alvo está em outro andar, eles vão pelas rampas.
- Spawns: o jogo escolhe o ponto mais longe dos vivos e penaliza spawns que estejam na linha de visão de alguém.
- Limitações conhecidas:
  - A colisão é feita de caixas alinhadas aos eixos. Por isso não há escadas de mão nem paredes inclinadas: os andares são ligados por rampas.
  - Os props redondos (barril, silo, copão) colidem como quadrados.
  - Os bots às vezes desviam do objetivo para pegar vida ou Copo Bomba.
  - Os bots não usam rocket jump nem pulam entre telhados.
  - Os telhados mais altos (prédios do Mercadão, quarteirões das Duas Pocilgas) ficam fora do grafo de propósito.
- Novo mapa: copie um bloco em `maps.js`, ajuste `boxes`/`props`/`spawns`/`pickups` e pronto. Rode `node test-maps.mjs` para conferir (carrega, bots andam, escadas e tetos).

## Regras
Todos contra todos, 4–6 bots. Vence quem chegar a 20 abates ou quem liderar ao fim de 5 minutos.

## Arquivos
- `index.html`, `style.css`: UI (menu com seletor de skin, HUD, pausa, placar)
- `main.js`: jogo (física, armas, bots, áudio, fluxo, seletor de mapas)
- `maps.js`: **mapas (só dados)** · `world.js`: construção do mundo/miniaturas · `nav.js`: grafo de navegação + A* dos bots
- `docao.js`: modelo 3D procedural do Docão (fiel à arte oficial), braços em 1ª pessoa e peças básicas (`PARTS`)
- `costumes.js`: peças de fantasia (chapéus, jaquetas, capuz, etc.)
- `skins.js`: **registro de skins (só dados)**
- `render.html`: renderiza um Docão isolado (`?skin=clube&rot=0.6&frame=face`) para conferir skins
- `vendor/`: Three.js r169 + BufferGeometryUtils
- `test.mjs` / `test-maps.mjs` / `compare.mjs` / `skingrid.mjs`: testes headless com Playwright (geram `screenshots/`)

## Como adicionar uma skin
Abra `skins.js` e acrescente um objeto no array `SKINS`:

```js
{
  id: 'milan',                       // único, vai pro localStorage
  name: 'Rubro-Negro',               // nome no menu
  shirt: {
    color: '#c8102e',                // cor base da camiseta
    trim: '#111111',                 // gola + punhos
    pattern: { type: 'stripes', colors: ['#c8102e', '#111111'], count: 12 }, // ou 'hoops' (horizontal) ou null
    logo: { text: 'C!', color: '#f5e6d0', outline: null, sub: 'cheers' },    // text 'C!' = logo Cheers; outro texto = letra/número
  },
  pants: '#111111',                  // shorts
  body: { tone: '#ee9c22' },         // opcional; travado na faixa amarelo-laranja
  parts: [                           // opcional; peças do catálogo PARTS
    { type: 'cap', color: '#7DF9FF', brim: '#12233a', logo: true },
    { type: 'glasses', color: '#2a1408' },
  ],
},
```

Campos extras da camiseta: `sleeves: 'short' | 'long' | 'puffy'`, `sleeveColor`, `logo.size / logo.x / logo.y`,
`details: [{ type: 'military' | 'frogs' | 'clouds' | 'tie' | 'zipper' | 'backStripes' | 'bones' | 'tunicWrap' | 'stillsuit', ... }]`.
Outros campos opcionais da skin: `face: { paint: 'skull' }` (pintura leve no rosto), `eyes: { iris: '#hex' }` (tom da íris) e `float: true` (flutua e deixa rastro no jogo).

Peças 3D disponíveis (`parts`):
- chapéus: `cap`, `fedora`, `bucketHat`, `roundCap`, `hood` (capuz com orelhas de fantasia)
- cabelo: `longHair` (com `headband` opcional)
- rosto: `glasses`, `sunglasses`
- mãos/pés: `glove` (`hand: 'right' | 'left' | 'both'`, brilho), `shoes`, `socks`
- corpo: `epaulettes`, `puffer`, `chain`, `robe`, `scarf`, `wand`, `mandarinCollar`, `vest`, `fish`, `boltTail`, `bandana`, `headphones`
- fantasias: `ghostSheet` (lençol com capuz, barra ondulada e brilho ciano), `boneLimbs` (ossos nas mangas/pernas), `sash` (faixa/cinto),
  `laserSword` (espada laser no cinto), `armWraps` (faixas nas mangas, também em 1ª pessoa), `hoodDown` (capuz abaixado nas costas),
  `noseTube` (tubo do traje até o lado do focinho), `desertScarf`

Os braços em 1ª pessoa usam automaticamente manga, punho, luva, faixas (`armWraps`) e ossos (`boneLimbs`) da skin.
Para um tipo novo de peça, crie uma função em `PARTS` no `costumes.js`: ela recebe `(opções, rig)` e devolve um `THREE.Object3D`
(`userData.anchor = 'head'` para prender na cabeça) ou altera o rig (ex.: trocar o material da mão).

Skins atuais (14): Clássico, Clube Cheers, Rei do Pop, Rapper da Hora, Bruxinho, Mestre do Kung Fu, Cabeludo, Pescador, Choquinho, Boné da Firma,
Fantasminha, Esqueletão, Cavaleiro Galáctico, Nômade do Deserto.
São fantasias *inspiradas*: sem nomes, rostos ou logos de pessoas/personagens reais.
A identidade (corpo de porquinho, focinho, orelhas, bochechas, olhos, contorno) não é configurável de propósito.

A skin escolhida fica salva em `localStorage['docao.skin']`; os bots recebem skins aleatórias.
