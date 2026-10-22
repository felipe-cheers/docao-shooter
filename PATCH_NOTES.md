# 🐷 Docão Shooter — Patch Notes

Jogue em **https://docao.mvalentim.dev**

---

## 🧪 Em teste — Modo Bomba: Planta o Botijão 💣🔥 (protótipo, branch `feature/modo-bomba`)
Ainda **não está no site**. Primeiro protótipo de um modo estilo Valorant, com o Docão:
- **Ataque × Defesa** (Vermelho × Azul). O Ataque leva o **Botijão do Churrasco** até o site **A** ou **B** e segura **E** por 4 s pra plantar. A Defesa segura **E** por 7 s pra desarmar (passou da metade, fica salvo).
- Plantou: o botijão **bipa cada vez mais rápido** e **explode em 45 s**, levando todo mundo num raio de 16 m.
- Rodada: 10 s de preparação (parado no spawn), 100 s pra plantar. Explodiu = ponto do Ataque; desarmou ou o tempo acabou = ponto da Defesa.
- **Primeiro a 13 rodadas vence.** Depois da 12ª: **"Troca de lado!"**
- O **renascimento continua normal** (5 s + RENASCER), no spawn do seu lado. A rodada não acaba por eliminação.
- Sites A/B marcados no chão e na tela (seta com a distância) nos 7 mapas. Bots plantam, escoltam, guardam os sites e desarmam.
- Funciona offline e online.

 — Respiro 💚 (21/10/2026)
- **Vida regenera fora de combate:** levou dano de outro Docão e ficou **5 segundos** sem apanhar? A vida volta sozinha, **+10 por segundo**, até 100. Levou dano de novo, os 5 segundos recomeçam.
- **Mas só se o dano não foi seu:** se o último dano veio de você mesmo (foguete da bazuca no pé, seu próprio Copo Bomba, seu míssil), não regenera, e isso cancela a regeneração que ia começar. Quer a vida de volta? Fica longe da própria explosão.
- Enquanto regenera, a barra de vida brilha verdinho com um "+" pulsando.
- Vale pros bots também. No online quem decide é o servidor.

## v1.6 — Bacon Restaurador 🥓❤️ (21/10/2026)
O bacon agora serve pra alguma coisa: **quem pisar no bacon de um Docão morto ganha +10 de vida!**
- Vale pra qualquer um que estiver vivo: inimigo, aliado ou quem fez a vítima virar bacon. Só o próprio morto não come o bacon dele.
- Comeu: aparece **"+10 de vida (bacon!)"**, toca um "nhac nhac" e o bacon some numa nuvenzinha rosada. A vida não passa de 100. Se você já está com 100, o bacon fica no chão pra outro.
- Dá pra pegar enquanto o bacon estiver no chão (uns 3 segundos). Se ninguém pegar, ele some como antes. Agora ele cai pertinho de onde o Docão morreu.
- Os bots também comem: pegam quando passam por cima e, com pouca vida, vão atrás de um bacon que esteja perto.
- No online quem decide é o servidor, então todo mundo vê o mesmo bacon sumir.

## v1.5.7 (21/10/2026)
- **Piso e telhado não piscam mais:** onde duas superfícies ficavam exatamente no mesmo plano (laje em cima da parede, faixa no piso, asfalto, meio-fio…) a imagem ficava trocando de cor quando você mexia a câmera. Agora cada uma fica no seu lugar. A colisão continua igualzinha.
- **Bacon não afunda mais no chão:** quando um Docão morre, a tira de bacon fica deitada por cima do piso (no chão ou num telhado), sem afundar nem no fim da animação.
- **RENASCER já trava o mouse:** clicar em RENASCER (ou apertar Espaço/Enter) já volta a mirar na hora. O aviso "Clique pra voltar a mirar" só aparece se o navegador não deixar, e some assim que o mouse trava.
- **A mira do centro da tela não pisca mais.**
- Bots não ficam mais parados no meio da rampa achando que já chegaram no telhado.

## v1.5.6 (21/10/2026)
- **Correção: Docão preso na parede** em todos os mapas. Quem saía da borda de um telhado, caixa ou rampa caía "dentro" da lateral dela, e quem subia escada/rampa debaixo de viga ou verga de porta enfiava a cabeça nela. Daí nenhuma direção funcionava.
  - O chão agora usa a mesma largura do corpo, então você para na borda em vez de afundar na parede.
  - Degrau e rampa só sobem se a cabeça couber.
  - Se por algum motivo o Docão ficar dentro de alguma coisa, ele é empurrado pra fora na hora (sem atravessar parede).
  - Empurrões fortes (explosão) não atravessam mais parede fina.
- O jogo e o servidor usam exatamente a mesma física agora, então no online o servidor não te "puxa de volta" quando você encosta no teto ou numa parede.

## v1.5.5 (21/10/2026)
- **Captura bem mais demorada na Dominação:** sozinho na zona agora leva **25 s**, e cada aliado a mais tira 1 s: 2 → 24 s, 3 → 23 s… até **16 s com 10**. Neutralizar o progresso do outro time vai na mesma velocidade.
- Zona vazia continua perdendo 10% por segundo (zera em até 10 s).

## v1.5.4 (21/10/2026)
- **Tempo da partida configurável:** ao criar a sala (e no lobby, só o anfitrião) tem o campo **Tempo**: Padrão, 3, 5, 7, 10, 15 ou 20 min. "Padrão" continua 5 min no Mata-mata e 7 min na Dominação. Quem não é anfitrião vê o tempo escolhido no lobby. Mudou no meio da partida? Vale a partir da próxima. O menu offline também ganhou o campo **Tempo**.
- **Captura mais demorada na Dominação:** sozinho na zona leva **15 s** (antes 8 s); com 2 do time, 7,5 s; com 3 ou mais, 5 s.

## v1.5.3 (21/10/2026)
- **Salas online com até 10 jogadores:** ao criar a sala ou no lobby, o máximo agora vai até **10** (com bots completando, se quiser). Dois bots novos, **Coxinha** e **Pururuca**, e o placar do canto mostra até 10 linhas.

## v1.5.2 — Skins novas (21/10/2026)
Agora são **17 skins**. Chegaram três novas no fim da lista:
- **Boi Caprichoso:** chifrinhos brancos, túnica azul com estrela branca no peito, franja nos ombros e saiote de fitas azuis e brancas.
- **Docão Felipe:** cabelo bagunçado, óculos pretos grossos, camisa grafite com listras verde-água, short preto e tênis preto de sola branca.
- **Docão Matheus:** topete curto, bigodinho e barba rala, olhos verdes, moletom preto de capuz, crachá vermelho da Cheers com o "C!", calça preta e tênis branco.
- No online as skins novas aparecem certinho pra todo mundo (servidor atualizado junto).

## v1.5.1 (21/10/2026)
- **Renascimento agora leva 5 s e tem botão:** depois de morrer o botão mostra a contagem ("Renascer em 4.2s") e, liberado, você volta clicando em **RENASCER** (ou Espaço/Enter). Dá tempo de escolher a arma com calma.
- Bots continuam renascendo sozinhos; no online vale o mesmo (o servidor só te traz de volta quando você clica).

## v1.5 — "Churrasco Moggado" (21/10/2026)
- **Faca de churrasqueiro:** nova arma no **slot 3** (tecla 3, rodinha ou **V** pra troca rápida; no cartão da tela de morte o atalho é **V**).
  - **Clique esquerdo:** golpe (segurando, repete).
  - **Botão direito:** estocada, só com a faca na mão. Nas armas de fogo o botão direito continua sendo a mira.
  - **Pelas costas mata na hora.**
  - Kill feed novo: **"X moggou Y [Faca]"**, tela de morte com **MOGGADO!** e "Você foi moggado por [nome]".
- **Animações de recarga** em todas as armas: pente caindo, cartuchos entrando, ferrolho das snipers, bazuca no ombro (também em 3ª pessoa).
- Correção: as armas voltam a dar dano depois de **Próximo mapa** e **Jogar de novo** no online.
- Correção: a skin do Docão volta a aparecer no menu logo no começo.
- Correção: na **Vizinhança Cheers** a câmera do menu ficava dentro do ônibus e a skin não aparecia; agora ela procura um ângulo livre em qualquer mapa. A barra de prêmios por abate não aparece mais por cima do Docão no menu.
- **Tela de morte compacta**, ancorada embaixo: todas as armas cabem mesmo em telas menores.

## v1.4 — "Pururucado" (21/10/2026)
- **Kill feed novo:** "carimbou" virou **"pururucou"**, com frases engraçadas sorteadas a cada abate:
  *fritou, transformou em torresmo, mandou pra chapa, defumou, fez virar bacon, serviu no café da manhã, botou no espeto, temperou com chumbo…*
- Tela de morte agora mostra **PURURUCADO!** e "Você foi pururucado por [nome]".
- Suicídio: "se pururucou", "virou bacon sozinho", "se jogou na frigideira", "fritou no próprio óleo".
- Tiro na cabeça: **"direto no focinho!"**

## v1.3 — Bacon & Nomes (21/10/2026)
- **Animação de morte:** o Docão estoura e vira **bacon** fritando no chão (com fumaça, brilho de gordura e chiado).
- Câmera de morte em 3ª pessoa mostrando o seu bacon antes de escolher as armas.
- **Nome do jogador:** campo no menu, na janela online e no lobby (botão "Trocar"). Fica salvo e aparece na plaquinha, no placar, no kill feed e na tela final. Nomes repetidos viram "Nome (2)".

## v1.2 — Mapas v2 (21/10/2026)
Os 7 mapas foram refeitos com construções de verdade: casas com interior, escadas, andares, telhados, becos, cobertura e corredores longos pra AWP. Bots sobem e descem andares.
- **Duas Pocilgas** (estilo Dust2): túneis do B, portas do meio, catwalk, longo do A, casas de 2 andares.
- **Mercadão** (estilo Mirage): palácio com sacada, apartamentos, conector, sala da janela, mercearia.
- **Vizinhança Cheers** (estilo Nuketown): duas casas de 2 andares com varanda, telhado da garagem, quintais, ônibus.
- **Celeiro Industrial** (estilo Rust/Office): galpão com mezanino, escritórios, ponte, contêineres, guarita, silos.
- **Bar Cheers Noturno** (estilo Office): ala de 2 andares, VIP com sacada, terraço, banheiros, sinuca, palco do DJ.
- **Arena da Fazendinha** (3 corredores): bases de 2 andares com terraço, celeiro com jirau, túnel do galinheiro.
- **Torres Gêmeas do Barril** (mapa de sniper): torres de 3 níveis, ruínas, trincheira, ponte e casamata.
- Correção: quem entra no meio da partida sempre escolhe o time antes de nascer.

## v1.1 — Dominação (20/10/2026)
- **Novo modo Dominação:** dois times (Vermelho × Azul). Zonas aparecem em pontos aleatórios; quanto mais gente do time dentro, mais rápido captura (até 3×). Zona disputada pausa. Primeiro time a **5 zonas** vence.
- Seta na borda da tela com a **distância em metros** até a zona.
- **Placar sempre visível** no canto superior esquerdo.
- **Escolha de time** (Vermelho / Azul / Automático) antes da partida e ao entrar no meio.
- **Tela de morte clicável:** escolha as armas com o mouse (teclas continuam funcionando).
- **Explosões melhores:** bazuca e granada medem a distância até o corpo (não o centro) e pegam quem está meio escondido; foguete direto sempre acerta.
- **AWP mais precisa:** dispersão zero com luneta parado, tiro sai exatamente do centro da mira.

## v1.0 — Multiplayer online (20/10/2026)
- **Jogar online com amigos** (grátis, servidor na Cloudflare): crie uma sala e mande o link `docao.mvalentim.dev/?sala=ABCD`.
- Até 8 jogadores, bots completam a sala, o dono escolhe mapa e quantidade.
- Servidor decide tiros, dano, granadas, foguetes, placar e respawn (com anti-cheat básico e compensação de lag).
- Reconexão automática mantendo o placar.

## v0.x — Lançamento
- FPS do Docão inspirado no Shell Shockers, contra bots.
- 14 skins: Clássico, Clube Cheers, Rei do Pop, Rapper da Hora, Bruxinho, Mestre do Kung Fu, Cabeludo, Pescador, Choquinho, Boné da Firma, Fantasminha, Esqueletão, Cavaleiro Galáctico e Nômade do Deserto.
- Armas: fuzil, AWP, 12, bazooka e pistola (1 primária + 1 secundária).
- **Granada Red Cup** com o logo Cheers: até 3 cargas, segure Q pra dosar a força.
- Zoom no Shift.
