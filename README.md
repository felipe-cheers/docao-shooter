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

## Online (multiplayer) 🌐

No menu: **JOGAR OFFLINE (bots)** funciona como sempre; **JOGAR ONLINE** abre:
- **Criar sala** — mapa (ou Aleatório), máximo de jogadores (2–8) e "completar com bots" (sim/não). Gera um **código de 4 letras**.
- **Entrar na sala** — digite o código. Ou abra o link de convite `https://…/?sala=ABCD` (entra direto no lobby).
- No lobby o **anfitrião** (★) troca mapa/máximo/bots e clica **INICIAR PARTIDA**. No fim, só o anfitrião escolhe "jogar de novo" / "próximo mapa".
- Durante a partida: ping no canto (Sala ABCD · 35 ms), placar (Tab) com ping de cada um, kill feed do servidor. Esc não pausa o jogo online (só solta o mouse).
- Caiu a conexão? O cliente reconecta sozinho (até 10 tentativas) e volta com o mesmo jogador/placar (token na `sessionStorage`; a vaga fica guardada 30 s).

### Arquitetura
- **Servidor:** `server/` — Cloudflare Worker + **Durable Object `Room`** (SQLite-backed, plano grátis). Um objeto por código de sala (`idFromName(código)`).
  - `POST /api/rooms` cria sala · `GET /api/rooms/ABCD` consulta · `GET /ws/ABCD?name=&skin=&primary=&token=` (WebSocket) · `GET /health`.
  - **WebSocket Hibernation API** (`ctx.acceptWebSocket`): no lobby o objeto pode hibernar sem custo; config e jogadores são restaurados dos anexos dos sockets + storage.
    `ping`→`pong` é resposta automática (`setWebSocketAutoResponse`): não acorda o objeto e não conta como requisição.
  - Sala vazia: alarme de 2 min apaga tudo (`storage.deleteAll()`).
- **Servidor autoritativo** (`server/src/game.js`, sem DOM/Three.js): acertos, dano, abates, placar, renascimento (escolha de spawn),
  pickups, Copo Bomba e foguetes (física + explosão + empurrão), tempo de partida e fim de partida. Usa os mesmos módulos do cliente:
  `maps.js` (dados), `nav.js` (grafo dos bots), `shared/rules.js` (armas/constantes) e `shared/physics.js` (colisão — o teste confere que as caixas são idênticas às do `world.js` em todos os mapas).
- **Cliente** (`net.js` + seção Online do `main.js`): move o próprio Docão localmente (sem atraso) e manda a ~20 Hz posição, velocidade, mira, arma e
  eventos (`f` tiro com origem + direções de cada bago, `r` foguete, `n` Copo Bomba, `rl` recarga, `pr` primária). Os outros Docões são desenhados com
  **interpolação de 100 ms**, com skin, nome, arma, pose de recarga, bolha de proteção e animação de andar.
- **Tiro:** hitscan **no servidor** contra a cópia dele das posições, com **compensação de lag "lite"** (volta no tempo `ping/2 + 100 ms`, máx. 300 ms).
  O cliente só diz de onde e pra onde atirou; dano/abate vêm do servidor.
- **Anti-cheat básico:** velocidade máxima por pacote (folga para empurrão de explosão/rocket jump), dentro do mapa e fora das paredes (senão o servidor devolve o jogador pra última posição válida);
  cadência por arma (relógio do cliente + checagem de que ele não anda mais rápido que o do servidor), **munição/pente/recarga contados no servidor**,
  origem do tiro perto do olho, Copo Bomba só se tiver e com velocidade máxima.
- **Bots online:** simulados **no servidor** (mesma IA dos bots offline: alvo por visão, faixa de distância por arma, strafe, Copo Bomba, A* no grafo de navegação).
  Ocupam as vagas livres; quando alguém entra no meio da partida um bot sai. Custo medido: ~0,05 ms por tick com 7 bots.
- **Loop:** 20 Hz. Os ticks rodam "de carona" nas mensagens dos clientes (cada mensagem é uma invocação com o próprio limite de CPU) e um `setInterval`
  completa os buracos — se nenhum cliente mandar nada por 1 s, a simulação para (nunca acumula CPU numa invocação só).

### Configuração do cliente
`config.js`: `SERVER_URL` (padrão `wss://docao-shooter-server.valentimm.workers.dev`). Dá pra trocar pela URL: `?server=ws://127.0.0.1:8787`.
Também `?hz=10` muda a taxa de envio (padrão 20/s).

### Deploy do servidor
```
cd server
npm install
npx wrangler login          # uma vez
npx wrangler deploy         # publica docao-shooter-server.<subdomínio>.workers.dev
```
Se o subdomínio/nome mudar, ajuste `SERVER_URL` em `config.js`. Para gerar o bundle sem publicar: `npx wrangler deploy --dry-run --outdir dist` → `server/dist/index.js`.
Config (`server/wrangler.jsonc`): Durable Object `Room`, binding `ROOMS`, migração `v1` com `new_sqlite_classes: ["Room"]`.
O site (Vercel) não precisa de nada: `.vercelignore` deixa `server/` e os testes de fora.

**Limites do plano grátis (estimativa):** cada mensagem recebida por WebSocket conta 1/20 de requisição (100 mil/dia). 8 humanos a 20 Hz ≈ 8 req/s → ~3,5 h de partida cheia por dia;
2 humanos ≈ 14 h/dia. Mensagens enviadas pelo servidor não contam. Se precisar economizar, use `?hz=10` (ou mude `SEND_HZ`).

### Testar online localmente
```
cd server && npx wrangler dev --port 8787 --var ALLOW_TEST:1     # ALLOW_TEST só para o teste automatizado (aceita teleporte)
python3 -m http.server 8124                                       # na raiz do jogo
node test-online.mjs http://localhost:8124/ ws://127.0.0.1:8787
node test-online-dom.mjs http://localhost:8124/ ws://127.0.0.1:8787   # Dominação online
node test-online-idle.mjs http://localhost:8124/ ws://127.0.0.1:8787  # sala parada + entrada no meio (~3 min)
```
Para jogar em duas abas: `http://localhost:8124/?server=ws://127.0.0.1:8787`.

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

Mapas v2: tudo foi refeito para parecer mapa de FPS de verdade. São prédios com interior, portas e janelas, vários andares ligados por rampas, telhados e sacadas onde dá pra subir, becos, gargalos e flancos, e nenhum campo aberto (todo ponto fica a ≤ 7 m de uma cobertura). Cada mapa tem pelo menos uma linha longa de Sniper.

| Mapa | Inspiração (só layout) | Destaques |
|---|---|---|
| **Arena da Fazendinha** | 3 corredores, estilo Shipment / Rust | bases de 2 andares nas pontas com terraço no telhado; celeiro no meio com portões largos e jirau com janelas pros dois lados; galinheiro-túnel no corredor norte; caixa d'água alta no sul (linha de Sniper por baixo); galpões com rampa até o telhado |
| **Duas Pocilgas** | Dust2 | túneis do B cobertos, com parede em zigue-zague; túnel de baixo até o meio; portas do meio e caixote; catwalk alto até o A; longo com portões; casa do meio de 2 andares com janelas pro meio e pro longo; casa do A e janela do B com terraço; casa do CT olhando o meio inteiro |
| **Celeiro Industrial** | Rust / Office | galpão com vão central de pé-direito duplo, mezanino em volta com escritórios e guarda-corpo, rampas e telhado com casas de máquina; ponte do mezanino até a torre de contêineres; pátio de contêineres com pilha e rampa; guarita de 2 andares; silos |
| **Mercadão** | Mirage / Inferno | palácio de 2 andares com sacada e rampa sobre o A; beco da rampa; conector (jungle); sala da janela de 2 andares no fim do meio; apartamentos de 2 andares com corredor em cima e sacada pro B; mercearia (B curto); beco de flanco; fonte no B; quiosque com rampa até o telhado |
| **Torres Gêmeas do Barril** | mapa comprido de Sniper (Blood Gulch / Facing Worlds) em 3 corredores | torres de 3 níveis com muretas; ruínas de 2 andares sem telhado e trincheira no oeste; planaltos com ruínas e ponte com pilares no meio; paredões de pedra e casamata com telhado (rampas nas pontas) no leste |
| **Vizinhança Cheers** | Nuketown | duas casas de 2 andares com divisórias, portas e sacada; garagem com telhado ligado ao 1º andar; rampa até o telhado da casa; quintais cercados; galpão com rampa de caixotes; ônibus e caminhões na rua |
| **Bar Cheers Noturno** | Office (+ Shell Shockers) | ala norte de 2 andares (cozinha, corredor e depósito embaixo; VIP com janelões e sacada em cima; terraço no telhado); banheiros com cabines; escritório; sala de sinuca; camarotes; corredores laterais compridos (linha de Sniper); balcão em U, palco com DJ e neon |

Toda a geometria, os nomes e a arte são originais (nada copiado dos jogos citados).

**Como funciona**
- `maps.js` é só dados. Cada mapa tem:
  - `id`, `name`, `desc` e `size`;
  - `wallH`/`wallColor` e `palette` (céu, neblina, luz, chão, xadrez, nuvens/estrelas, luzes pontuais);
  - `boxes` e `props`;
  - `spawns`, `pickups` (`health`, `ammo` e `grenade` = Copo Bomba) e `waypoints` extras;
  - `showcase`/`view` e `test`.
- Para montar o layout há helpers: `B()` caixa, `R()` rampa, `wallX`/`wallZ` (paredes com `door()`/`win()`), `mirrorZ`/`rot180` (espelhar bases) e o kit v2:
  - `building(x0, z0, x1, z1, { floors, H, ops, stairs, inner, roofGaps, floorHoles, parapet })` monta um prédio com paredes por andar, portas, janelas e portões largos (`ops`), lajes com vão das rampas (`stairs`), divisórias internas com portas (`inner`), telhado com mureta e vãos (`roofGaps`) e vãos extras na laje (`floorHoles`, para mezanino).
  - Cada porta gera waypoints (dentro, na porta e fora) para os bots passarem por portas estreitas.
  - `slab()` (laje com furos), `crate()`, `balcony()` e `fin()` (separa caixas de waypoints).
  - Dica: comece a rampa a ≥ 1 m da parede, senão não dá pra subir; se o topo encostar na parede, saia pelo lado.
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
  - Alguns telhados ficam fora do alcance de propósito (quarteirões maciços, celeiro do meio, galinheiro, palácio).
- Novo mapa: copie um bloco em `maps.js`, ajuste `boxes`/`props`/`spawns`/`pickups` e rode:
  - `node test-map-audit.mjs [ids]` (sem navegador): andares no grafo, nós altos e cobertos, "sem campo aberto", linha longa de Sniper, exposição, spawns e itens alcançáveis, zonas da Dominação, e uma partida simulada no servidor em que os bots precisam subir e descer andares. Com `DUMP=/tmp/audit` dá pra gerar a planta: `python3 tools/planta.py /tmp/audit/<id>.json planta.png`.
  - `node test-maps.mjs` (navegador): carrega, bots andam, escadas, telhados e lajes; falha se algum item falhar.
  - `node tools/screenshots-mapas.mjs`: gera `screenshots/18-mapa-<id>-{visao-geral,predio,telhado}.png` (câmera livre via `window.__cam`).

## Regras e modos
Escolha o modo no menu (offline) ou ao criar a sala (online; o anfitrião pode trocar no lobby).

- **Mata-mata** (todos contra todos): vence quem chegar a 20 abates ou quem liderar ao fim de 5 minutos.
- **Dominação** (times Vermelho × Azul): regras em `shared/domination.js`, as mesmas offline e no servidor.
  - Uma **zona de captura** (anel + coluna de luz, raio 4 m) aparece num ponto andável aleatório; barra de progresso no topo e seta na borda da tela quando ela está fora de vista.
  - **Velocidade:** 1/8 por segundo por jogador dentro, até **3** contando (1 → 8 s, 2 → 4 s, 3+ → 2,7 s).
  - **Contestada** (os dois times dentro): o progresso **para**. Time adversário sozinho primeiro **neutraliza** o progresso do outro, depois começa o seu.
  - **Vazia:** o progresso **decai** 0,1/s até zerar (zona volta a neutra).
  - Cada captura = **1 ponto** pro time; a zona reaparece em outro lugar (≥ 18 m da anterior, quando dá). **Primeiro a 5 vence**; tempo limite 7 min (empate se igual).
  - Placar individual na Dominação: abates + 2 × zonas capturadas.
  - **Sem fogo amigo** (tiro, Bazuca e Copo Bomba); dano da explosão em si mesmo continua (40%).
  - Contorno, anel no pé e plaquinha de nome na cor do time.
  - **Escolha de time** (Vermelho / Azul / Automático) no lobby, no menu offline e ao entrar no meio da partida (antes de nascer).
    Automático = time com menos gente. Uma escolha é **recusada se deixaria aquele time com 2+ humanos a mais** que o outro; aí você vai pro Automático e aparece um aviso.
    Trocar de time no meio da partida conta como morte (sem pontuar pra ninguém) e você renasce no time novo.
  - Bots completam os dois times (e são remanejados se um time ficar 2+ maior), vão pra zona, contestam e só miram em inimigos.
- **Placar ao vivo** sempre no canto superior esquerdo (até 8 linhas, você destacado; na Dominação com o placar dos times).

## Explosões (Bazuca e Copo Bomba)
Regra única em `shared/combat.js` (cliente offline e servidor):
- O dano usa a distância até o **ponto mais próximo do corpo** (cápsula do Docão, raio 0,58 m), não até o centro: `dano = máx × (0,2 + 0,8 × (1 − d/raio))`.
- **Linha de visão** testada de 2 pontos da explosão até 4 pontos do corpo (ponto mais próximo, pé, peito, cabeça): basta um livre. Atrás de mureta com a cabeça de fora ainda pega.
- O foguete colide com o **casco** do Docão (cápsula + 0,15 m); **acerto direto = dano máximo** em quem foi atingido.
- O anel/clarão da explosão tem o mesmo tamanho do raio de dano (5 m Bazuca, 6 m Copo Bomba).

## Sniper Torresmo (precisão)
- Com a **luneta aberta** (o overlay aparece) e **parado ou quase** (< 1,5 m/s): dispersão **zero**. Andando com luneta: 0,012; no ar: 0,02. Sem luneta: 0,025 parado, 0,045 andando.
- O tiro sai **exatamente do centro da câmera**; a Sniper não desloca a mira com coice (só efeito visual).
- Online, o cliente manda o tempo do servidor que estava vendo na tela (interpolação) e o servidor volta os alvos exatamente pra esse instante (até 400 ms), com a mesma altura de olho (1,6 m) do cliente.

## Tela de morte
Os cartões de arma são **clicáveis** (as teclas 1–4 continuam valendo), e dá pra marcar “renascer com a pistola na mão”.
Ao morrer o mouse é solto (sem pausar); clique na tela ou em **VOLTAR AO JOGO** para mirar de novo.

## Morte = BACON 🥓
Quando qualquer Docão morre (você, outro jogador ou bot), ele dá um "pop" (achata), some numa nuvem de fumaça e vira uma **tira de bacon** ondulada (carne vermelha/rosada com listras de gordura, cel-shading com contorno). O bacon pula, quica no chão chiando (som WebAudio + faíscas de gordura), fica ~3 s e encolhe.
- **Câmera da morte**: você vê o seu bacon em 3ª pessoa (órbita lenta, encurta se tiver parede) por 1,1 s; depois aparecem os cartões de arma.
- Tudo no cliente (`bacon.js`): geometria/materiais únicos, pool de 14 bacons + fumaça + faíscas (nada é criado durante a partida). Online usa os eventos de morte que o servidor já manda — sem mudança no Worker.
- Teste: `node test-bacon.mjs` (offline, gera `screenshots/19-bacon-*.png`); `test-online.mjs` confere bacon de remoto, do próprio jogador e de bots.

## Nome do jogador
Campo "Seu nome" no menu, na janela "Jogar online" e no lobby (botão **Trocar**). É o mesmo valor nos três, salvo no navegador (`docao.name`).
- Regras em `shared/names.js` (cliente e servidor): tira tags/controles/caracteres invisíveis, junta espaços, máximo **16** caracteres, padrão "Docão".
- O servidor evita nomes repetidos na sala: o segundo "Matheus" vira **"Matheus (2)"** (o lobby avisa como você aparece). Bots não pegam nome de humano.
- Troca de nome vale no lobby/entre partidas (durante a partida muda na próxima).
- Teste: `node test-online-names.mjs http://localhost:8124/ ws://127.0.0.1:8787` (gera `screenshots/19-nomes-*.png`).

## Arquivos
- `index.html`, `style.css`: UI (menu com seletor de skin, HUD, pausa, placar)
- `main.js`: jogo (física, armas, bots, áudio, fluxo, seletor de mapas)
- `maps.js`: **mapas (só dados)** · `world.js`: construção do mundo/miniaturas · `nav.js`: grafo de navegação + A* dos bots
- `docao.js`: modelo 3D procedural do Docão (fiel à arte oficial), braços em 1ª pessoa e peças básicas (`PARTS`)
- `costumes.js`: peças de fantasia (chapéus, jaquetas, capuz, etc.)
- `skins.js`: **registro de skins (só dados)**
- `render.html`: renderiza um Docão isolado (`?skin=clube&rot=0.6&frame=face`) para conferir skins
- `vendor/`: Three.js r169 + BufferGeometryUtils
- `shared/domination.js` (zona, times) · `shared/combat.js` (explosões, colisão do foguete, dispersão da Sniper): regras usadas pelo cliente e pelo servidor
- `test.mjs` / `test-maps.mjs` / `test-dom.mjs` / `compare.mjs` / `skingrid.mjs`: testes headless com Playwright (geram `screenshots/`) · `test-shared.mjs`: testes das regras sem navegador · `test-map-audit.mjs`: auditoria de layout dos mapas + partida simulada (sem navegador) · `tools/planta.py` e `tools/screenshots-mapas.mjs`: planta e fotos dos mapas

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

### Encerramento da partida

O resultado encerra as regras imediatamente e mostra Vitória, Derrota ou Empate. A cena continua por 1,5 segundo em câmera lenta, com o movimento que já estava acontecendo, sem novos comandos, dano, capturas ou renascimento. Após 0,8 segundo o placar e os botões atuais entram sobre a mesma câmera; posição relativa, direção e zoom são preservados. Se o jogador já estava na câmera de morte, o enquadramento fica parado. A preferência do sistema por movimento reduzido abre o menu diretamente.

Vale para Mata-mata e Dominação, offline e online. O tempo oficial e o placar ficam congelados; pacotes de jogo recebidos depois do resultado online são ignorados até a próxima partida.

Teste de regressão: com o site servido localmente, execute `node test-match-end.mjs` (ou configure `SITE`). Cobre movimento, câmera, zoom, resultado, reinício, morte, movimento reduzido e o fluxo de mensagens online com WebSocket controlado. Não requer o Worker.
