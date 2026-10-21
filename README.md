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
WASD mover · Mouse mirar · Espaço pular · Shift ou botão direito: mirar/zoom (luneta nas três snipers) · Clique atirar (faca: golpe) · Com a faca na mão o botão direito vira a **estocada** · R recarregar · **1** primária / **2** pistola / **3** faca (ou rodinha) · **V** troca rápida faca ↔ última arma · Segure **Q**: Copo Bomba, solte para arremessar · **4** fumaça · **5** atordoamento · **F** rádio do "Fim da chapa" (quando o prêmio estiver pronto) · Morto: **1–6** escolhe a primária do próximo renascimento (1 Fuzil, 2 Calibre 12, 3 Sniper Torresmo, 4 Canhão do Barril, 5 Carabina da Granja, 6 Bazuca) · Tab placar · Esc (ou P) pausar

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

## Mira com zoom (Shift ou botão direito)

- **Segure Shift ou o botão direito** para mirar; solte para voltar ao normal. Com a **faca** na mão não há mira: o botão direito vira estocada.
- O zoom entra suave em ~0,15 s: FOV 75° → **40°** Fuzil Pururuca, **55°** Calibre 12, **13°** Sniper Torresmo, **8°** Canhão do Barril, **24°** Carabina da Granja (as três com luneta), **55°** Bazuca do Chiqueiro, **50°** Pistolinha Leitão.
- Mirando: sensibilidade do mouse cai na proporção do FOV (dá pra ajustar a da mira no menu), dispersão bem menor (fuzil 12% da normal, Calibre 12 60%, Bazuca 50%, pistola 40%; snipers: ver "Snipers (precisão)"), andar a 60% da velocidade, arma vai para o centro/levantada, vinheta suave nas bordas e mira menor.
- **Recarregar, trocar de arma ou puxar o ferrolho cancela o zoom/luneta**; se o botão continuar pressionado, o zoom volta sozinho quando termina.
- Dá para segurar Q (Copo Bomba) junto com a mira normalmente. Bots não são afetados.

## Armas e loadout (estilo "uma primária + pistola + faca")

Escolha **uma arma primária** no menu (ao lado das skins; fica salva no navegador). Morreu? Na tela de morte aperte **1–6**
(ou clique no cartão) para trocar a primária — vale no próximo renascimento. Todo mundo leva a **Pistolinha Leitão** como secundária,
a **Faca de churrasqueiro** (sempre equipada), o **Copo Bomba** (tecla Q), **1 fumaça** (4) e **1 atordoamento** (5) a cada vida.
**1** = primária, **2** = pistola, **3** = faca, a rodinha gira entre as três e **V** alterna faca ↔ última arma.
Todo Docão tem **100 de vida** (e 2 s de proteção ao renascer). Valores em `shared/rules.js` (`WEAPONS`, `MELEE`, `NADE`), os mesmos no cliente e no servidor.

| Arma | Tipo | Pente/reserva | Dano (cabeça) | Cadência | Recarga | Zoom |
|---|---|---|---|---|---|---|
| **Fuzil Pururuca** | automático | 30/120 | 20 (cabeça ×2 = 40) | 0,1 s | 1,6 s | 40° |
| **Escopeta Chiqueiro · Calibre 12** | pump, 8 bagos | 8/32 | 8×15 (cabeça ×1,5); dano cheio até 7 m, cai até 30% a 30 m | 0,8 s (pump) | 0,25 s pra começar + 0,45 s por cartucho — **atirar interrompe** | 55° |
| **Sniper Torresmo** | ferrolho médio | 5/20 | 100 corpo (1 tiro mata) / ×1,5 = 150 cabeça | 1,15 s (ferrolho) | 2,3 s | **luneta 13°** |
| **Canhão do Barril** | ferrolho lento, pesado | 3/6 | 180 em qualquer lugar (cabeça ×1, mata sempre) | 1,85 s (ferrolho) | 3,1 s | **luneta 8°** |
| **Carabina da Granja** | ferrolho rápido | 10/40 | 55 corpo (2 tiros) / ×2,2 = 121 cabeça (mata) | 0,58 s (ferrolho) | 1,9 s | **luneta 24°** |
| **Bazuca do Chiqueiro** | foguete lento (24 m/s) com fumaça | 1/4 | até 120 em área (raio 5 m), 40% em si mesmo, empurrão | 0,6 s | 2,5 s | 55° |
| **Pistolinha Leitão** (secundária) | semiautomática | 12/60 | 25 (cabeça ×2 = 50) | 0,16 s | 1,1 s | 50° |
| **Faca de churrasqueiro** (sempre) | corpo a corpo | — | golpe 40 · estocada 75 · **pelas costas mata** | golpe 0,42 s · estocada 1 s | — | — |
| **Copo Bomba** (Q) | granada | máx. 3 (nasce com 1) | até 130 em área (raio 6 m), 40% em si mesmo | — | — | — |

Alcance máximo do tiro: Fuzil 140 m, Calibre 12 45 m, Sniper Torresmo 220 m, Canhão do Barril 260 m, Carabina da Granja 180 m, Pistolinha 110 m.

- **Snipers (Torresmo, Canhão, Carabina):** sem mira e andando são imprecisas; com a luneta **parado** são perfeitas (ver "Snipers (precisão)").
  Cada uma tem a sua luneta (overlay preto com retícula própria) e a arma some da tela. Tiro alto com rastro grosso. Depois de cada tiro o ferrolho fecha a luneta até terminar.
  - **Torresmo:** a do meio, 1 tiro no corpo mata.
  - **Canhão do Barril:** pouca bala e lento, mas mata com qualquer acerto; luneta mais forte.
  - **Carabina da Granja:** rápida e com luneta mais aberta, mas precisa de 2 no corpo (ou 1 na cabeça).
- **Bazuca:** o foguete tem ponta de focinho de porquinho e faixa “C!”; explode ao bater em parede, chão ou Docão.
  Atire no chão embaixo de você para um **rocket jump** (~2,5 m de altura, perde ~40 de vida).
- **Caixas de munição** enchem a reserva da primária e da pistola; para a bazuca dão só **+1 foguete** (munição escassa).
- **Bots** recebem uma primária aleatória (às vezes trocam ao renascer) + pistola + faca e escolhem pela distância:
  Calibre 12 de perto (<14 m); snipers de longe (Torresmo ≥ 9 m, Canhão ≥ 14 m, Carabina ≥ 6 m, com atraso extra pra mirar e remira a cada tiro, mirando no corpo);
  Bazuca a média distância (6–28 m, mira no pé com antecipação, nunca atira colado); faca colada (< 3 m, ver abaixo); pistola no resto.
- Nomes no feed de abates: Fuzil Pururuca, Calibre 12, Sniper Torresmo, Canhão do Barril, Carabina da Granja, Bazuca, Pistolinha, Copo Bomba, Faca.
  Tiro na cabeça aparece como **“direto no focinho!”**.

## Faca de churrasqueiro 🔪 (slot 3, sempre equipada)
- **Tecla 3**, **V** (troca rápida) ou rodinha. Botão direito = mira (ADS) nas armas de fogo e **estocada só com a faca na mão**. Na tela de morte o cartão da faca aparece com a tecla **V** e "Sempre equipada ✓". Índice da arma: `KNIFE = 7` (depois das snipers Canhão do Barril = 5 e Carabina da Granja = 6).
- Faca de churrasqueiro com lâmina de aço, cabo de madeira com rebites e logo **C!** vermelho (cel-shading com contorno). Modelo em 1ª pessoa (parada, sacar, golpe, estocada) e na mão do boneco em 3ª pessoa; sons WebAudio de golpe/acerto.
- **Clique: golpe** — 40 de dano, alcance 1,6 m (até a superfície do corpo), cone com meia-abertura de ~36°, a cada 0,42 s (segurar o clique repete). **Botão direito: estocada** — 75 de dano, 1,8 m, cone mais estreito (~21°), a cada 1 s. Sem tiro na cabeça (dano igual em qualquer lugar).
- **Pelas costas mata na hora** (qualquer golpe; 1000 de dano). Com a faca na mão você corre **15% mais rápido**. Sacar leva 0,2 s. Sem munição, sem recarga, sem mira. Atordoado não usa a faca. A nuke do "Fim da chapa" não conta como facada pelas costas.
- Feed: **“X moggou Y [Faca]”** (frase fixa) e **“[Faca · pelas costas!]”**; quem morre vê **“Você foi moggado por X”** e o carimbo **MOGGADO!**. Na tela de morte o cartão da faca aparece como sempre equipado.
- Regra única em `shared/melee.js` (alcance pelo ponto mais próximo do corpo, cone, linha de visão, pelas costas), usada offline e no servidor. Online é **autoritativo**: o cliente manda `['m', tipo, olho, direção, relógio, tempoRender]`; o servidor confere faca na mão, posição do olho, cadência (relógio do cliente + piso no relógio do servidor), volta no tempo (lag comp com posição **e** direção do alvo) e aplica o dano. Evento novo `['ml', id, tipo, acertou]` só pra animação/som (clientes antigos ignoram).
- **Compatibilidade:** no evento de abate `'k'` o servidor manda a arma como Pistolinha (clientes antigos não conhecem a faca) e um campo extra `ev[7]` = 1 (faca) / 2 (pelas costas) que o cliente novo lê. Cliente antigo vê "pururucou [Pistolinha]" e o boneco sem arma na mão; não quebra. Faça o deploy do Worker antes do site.
- **Bots** puxam a faca de perto (< 3 m, sorteio a cada 1,5 s), correm pra colar e às vezes dão estocada.
- Testes: `node test-faca.mjs` (offline, `screenshots/20-faca-*.png`) e `node test-faca-online.mjs http://localhost:8124/ ws://127.0.0.1:8787`.

## Animações de recarga
Cada arma tem a sua, em 1ª e 3ª pessoa, com a mesma duração da recarga e cliques de recarga em WebAudio:
- **Fuzil / Pistolinha:** inclina a arma, o pente velho cai (malha caindo com física), entra o pente novo, puxa a alavanca/ferrolho no fim.
- **Sniper:** abre o ferrolho, coloca as balas uma a uma, fecha o ferrolho.
- **Calibre 12:** cartucho por cartucho (no ritmo do `shellReload`), pump no fim; atirar interrompe.
- **Bazuca:** abaixa do ombro e um foguete novo entra no tubo.
- Online os outros veem pela flag de recarga que já vem no snapshot (sem evento novo). Teste: `node test-reload.mjs` (`screenshots/20-reload-*.png`).

## Copo Bomba (granada)

- Um copo de festa vermelho com o logo "C!" que explode em confete vermelho/ciano, espuma e cerveja.
- **Segure Q** para carregar a força (barra enche em ~1,2 s; um arco tracejado mostra a trajetória) e **solte Q** para arremessar.
- O copo voa em arco com gravidade, quica nas paredes/chão e explode ~2,5 s após o arremesso.
- Dano em área (raio 6 m, até 130 de dano com queda pela distância), empurrão e tremida de tela; pode matar. Dano em si mesmo é reduzido (40%).
- Máximo de 3 copos; você nasce com 1. Coletáveis de copo (flutuando, anel ciano) dão +1 e reaparecem após ~20 s.
- O HUD mostra 3 ícones de copo ao lado da munição. No feed de abates aparece como **[Copo Bomba]**.
- Bots também pegam copos e arremessam em alvos a média distância.

## Granadas táticas: fumaça (4) e atordoamento (5)
Valores em `tactical-nades.js` (`SMOKE`, `STUN`). Você nasce com **1 de cada** por vida; o HUD mostra quantas restam. Arremesso reto na frente da mira (15 m/s, um pouco pra cima), quica no chão/paredes. **Só na partida com bots** (online aparece um aviso e nada é lançado).

| Granada | Tecla | Estoura em | Raio | Duração | Efeito |
|---|---|---|---|---|---|
| **Fumaça** | 4 | 1,15 s | 5,6 m | 12 s | nuvem cinza que **tampa a visão**: quem está dentro vê tudo coberto, e os Docões atrás da fumaça somem da tela |
| **Atordoamento** | 5 | 1,0 s | 7,2 m | 3,4 s | todo mundo no raio (inclusive você) fica **lento (35% da velocidade)**, com a tela ofuscada, e **não atira nem usa a faca**; bots perdem o alvo |

Nenhuma das duas causa dano.

## Prêmios por abates seguidos
Contador de abates seguidos no centro, embaixo da tela (zera quando você morre). Os prêmios ficam na lateral direita, de baixo para cima; o número em cada ícone é quantos abates faltam.
Depois do 7º o ciclo recomeça (o próximo prêmio é o de 3 de novo, no 10º abate). Os abates da nuke não contam pra sequência (os dos mísseis contam).

| Abates | Prêmio | O que faz |
|---|---|---|
| **3** | **Olho da granja** (UAV) | minimapa no canto superior esquerdo por **10 s**, mostrando os inimigos; segue você e gira com a sua frente (não mostra a fazenda inteira) |
| **5** | **Chuva de torresmo** (míssil pelo tablet) | o Docão puxa um tablet com a planta do mapa e você marca **3 lugares**; cai um míssil em cada (um a cada 0,42 s): raio 6,5 m, até **160** de dano, 15% em você mesmo, empurrão |
| **7** | **Fim da chapa** (nuke) | o prêmio fica guardado; aperte **F** pra puxar o rádio, começa uma contagem de **5 s** e **todo mundo no mapa morre, menos você** |

Os prêmios rodam no cliente: online o servidor ainda não aplica o dano dos mísseis nem da nuke.

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

## Snipers (precisão)
Vale para as três (Sniper Torresmo, Canhão do Barril e Carabina da Granja), regra `sniperSpread` em `shared/combat.js`:
- Com a **luneta aberta** (o overlay aparece) e **parado ou quase** (< 1,5 m/s): dispersão **zero**. Andando com luneta: 0,012; no ar: 0,02. Sem luneta: 0,025 parado, 0,045 andando, 0,06 no ar.
- O tiro sai **exatamente do centro da câmera**; as snipers não deslocam a mira com coice (só efeito visual).
- Online, o cliente manda o tempo do servidor que estava vendo na tela (interpolação) e o servidor volta os alvos exatamente pra esse instante (até 400 ms), com a mesma altura de olho (1,6 m) do cliente.

## Tela de morte
Os cartões de arma são **clicáveis** (as teclas 1–6 continuam valendo), e dá pra marcar “renascer com a pistola na mão”. A faca aparece com a tecla **V** como **sempre equipada** (não precisa escolher).
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
- `shared/domination.js` (zona, times) · `shared/combat.js` (explosões, colisão do foguete, dispersão da Sniper) · `shared/melee.js` (faca): regras usadas pelo cliente e pelo servidor
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
