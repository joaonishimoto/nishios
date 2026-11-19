# NishiOS

Sistema pessoal de gestão de vida. Já tem o shell do app (barra lateral, topo, tema claro e escuro), o design system um **calendário unificado** e doze módulos: **tarefas**, **rotina e metas**, **compromissos recorrentes**, **treinos**, **corpo**, **bens e desejos**, **casa**, **pessoas**, **pets**, **skills**, **culinária** e **finanças**.

Os dados ficam no `localStorage` do navegador e, com o Supabase configurado, sobem para a nuvem e sincronizam entre computador e celular. Sem o Supabase, o app roda só no navegador, sem login, e começa com exemplos.

![Tarefas](docs/screenshots/tarefas.png)

## Como rodar

Precisa do Node 20 ou mais novo.

```bash
cd ~ && git clone https://github.com/joaonishimoto/nishios.git
cd ~/nishios && npm install && npm run dev
```

Para atualizar depois e rodar de novo:

```bash
cd ~/nishios && git pull && npm install && npm run dev
```

Abra http://localhost:5173.

### Supabase (login e sincronização)

1. O `.env` já traz a URL e a publishable key do projeto (são públicas). Para o Google, crie `.env.local` com `VITE_GOOGLE_CLIENT_ID` (veja `.env.example`).
2. A migration em `supabase/migrations/` cria a tabela `app_state` (uma linha por chave `nishios:...`, com RLS) e a lista `allowed_users`: só os e-mails dela conseguem criar conta. Para liberar um e-mail: `insert into public.allowed_users (email) values ('seu@email.com');` no SQL Editor.
3. Login: "Entrar com Google" (precisa do provedor Google ligado no Supabase) ou link por e-mail. Em Authentication → URL Configuration, coloque `http://localhost:5173` e o domínio publicado em Redirect URLs.

Na primeira vez que um navegador entra: se a nuvem está vazia, tudo o que está nele sobe (é a migração dos dados atuais); se a nuvem já tem dados, eles passam a valer e o que havia no navegador fica numa cópia para baixar em Dados e backup. Depois, cada alteração sobe em segundos e o app traz o que mudou em outro aparelho ao voltar para a aba. O tema fica só no aparelho.

Outros comandos: `npm run build` (checa os tipos e gera a versão final em `dist/`) e `npm run typecheck`.

## O que tem

- **Início**: a agenda e a rotina de hoje, as tarefas que vencem hoje ou estão atrasadas, as metas mais perto de fechar, peso e treinos da semana, os pets, os compromissos que pedem atenção e as pessoas para procurar ou parabenizar.
- **Busca em tudo** (Cmd+K ou Ctrl+K, ou o campo no topo): acha tarefas, eventos, compromissos, hábitos, metas, pessoas, pets e seus cuidados, skills, receitas, bens, desejos, modalidades e cômodos, sem ligar para acento. O que você digitar também vira tarefa, evento de hoje, skill ou receita com um Enter.
- **Dados e backup**: baixa um arquivo com tudo o que está salvo, restaura de um arquivo (mostrando antes o que tem dentro), começa do zero ou volta aos dados de exemplo.
- **Ligações entre módulos**: o que é registrado em um lugar aparece nos outros.
  - Metas se atualizam sozinhas com treinos, peso e medidas, hábitos, tarefas concluídas e skills (materiais concluídos, nível ou número de skills aprendidas).
  - Hábitos podem se marcar sozinhos nos dias de treino.
  - Eventos têm "Com quem": depois que acontecem, contam como contato com a pessoa, e a ficha dela mostra os próximos eventos juntos.
  - Treinos podem ser planejados para a frente: aparecem no calendário e viram treino feito com um toque.
  - Compromissos podem ser a manutenção de um bem (a revisão é do carro): o bem mostra quando ela vence.
  - Maki e Gojo, os gatos que andam pela Casa em 3D, têm a ficha deles em Pets.
- **Calendário**: tudo o que tem data no sistema em um lugar só, em mês, semana ou agenda.
  - Junta eventos, prazos de tarefas, compromissos (com as próximas vezes já projetadas), treinos, prazos de metas, aniversários, hora de procurar pessoas, vacinas e consultas dos pets, garantias, compras planejadas e o diário de skills.
  - A forma da etiqueta mostra o estado: preenchida é o que vem pela frente, vazada é o que já aconteceu, vermelha é o que atrasou. O anel em cada dia mostra quanto da rotina foi cumprida.
  - O painel do dia permite concluir tarefas e marcar hábitos sem sair do calendário, e abre cada item no módulo de origem. Em "hoje" ele lista também o que ficou para trás.
  - Camadas: ligue e desligue cada origem.
  - Eventos próprios com hora, vários dias e repetição.
  - **iPhone**: "Enviar para o iPhone" gera um arquivo `.ics` que o Calendário da Apple importa (aniversários e eventos recorrentes vão com a repetição); "Trazer do iPhone" lê um `.ics` exportado de lá. O formato fica em `src/modules/calendario/ics.ts`; com o app publicado, a mesma função serve uma URL que o iPhone assina.
- **Tarefas** (fase 2): visão em lista ou em quadro, com situação (a fazer, em andamento, concluída), prioridade, prazo e lista.
  - "Adicionar tarefa" direto em cada grupo: digite e aperte Enter.
  - No quadro, arraste os cartões entre as colunas.
  - Painel lateral em que cada campo salva na hora. Filtro por lista e busca.
  - **Projetos**: a barra no topo separa as tarefas por projeto de trabalho (Todas, Sem projeto e um botão por projeto, com `?projeto=<id>` na URL). Tarefas antigas ficam em "Sem projeto". Cada projeto tem ícone, cliente, anotações e pode ser arquivado; excluir um projeto mantém as tarefas, sem projeto.
  - "Minha ordem": fila manual para priorizar, arrastando pela alça no computador ou com as setas no celular. "Prioridade" continua ordenando por prioridade e prazo.
  - Horas (opcional): "Registrar horas" no projeto ou na tarefa (aceita 1h30, 1:30, 1,5 ou 45min). O projeto mostra as horas do mês, o total e, com valor da hora, quanto isso vale.
  - Tarefas com prazo aparecem no calendário com o nome do projeto.
- **Rotina e metas** (fase 2):
  - Duas abas, Hábitos e Metas. Tudo que abre fica na URL (`?aba=metas`, `?habito=<id>`, `?meta=<id>`), então outras telas abrem o hábito ou a meta direto.
  - Hoje: a lista do dia separada por manhã, tarde e noite, com check grande, contador para hábitos de quantidade e "Escapei" para maus hábitos.
  - Tipos de hábito: dias fixos, "X vezes por semana" (vale qualquer dia até fechar a semana, e a sequência conta semanas), quantidade por dia (8 copos, 20 páginas; só fica feito ao chegar no alvo) e mau hábito ("Quero largar": você marca um X nos dias em que fizer, e o dia sem marca conta como vitória).
  - Hábitos podem ser pausados sem perder o histórico, ter um "por que importa" e começar de uma sugestão.
  - Semana navegável para trás, para corrigir dias passados. Detalhe do hábito com sequência atual, melhor sequência, cumprimento dos últimos 30 dias e as últimas 18 semanas em quadradinhos.
  - Metas com número, unidade, alvo e prazo opcional, "+1" de um toque e "Atualizar". Cada mudança fica guardada e vira gráfico.
  - Metas de etapas: uma lista para ir marcando (o progresso é quantas etapas foram concluídas).
  - Ritmo do prazo: a meta diz se está no ritmo, adiantada ou atrasada, com um risco na barra onde deveria estar hoje, quanto precisa por semana ou mês e, quando está atrás, quando chega no ritmo atual. Metas de investimento mostram quando chegam com o aporte mensal.
  - Filtro de metas em andamento, concluídas e todas.
- **Compromissos** (fase 1): lista agrupada por situação (atrasados, chegando a hora, sem registro, em dia), com filtro por situação e categoria e busca.
  - Cada compromisso tem período (dias, semanas, meses ou anos), última vez feita, próxima data calculada e antecedência do aviso.
  - "Marcar como feito" registra a data no histórico e recalcula a próxima.
  - Painel lateral com o ciclo, as anotações e o histórico. Criar, editar e excluir, com "Desfazer".
- **Treinos**: uma área só para toda atividade física, com modalidades dentro (musculação, luta, corrida, caminhada, natação e as que você criar).
  - Visão geral: a semana com os treinos de cada dia, um cartão por modalidade com o número do mês e o histórico.
  - Cada modalidade tem um tipo, que define o que se registra: força (exercícios, séries, repetições e carga), luta (estilo e rounds), distância (km ou metros, com ritmo calculado) ou só duração.
  - Ao abrir uma modalidade aparecem os números dela. Em corrida e natação, distância, ritmo médio e maior distância.
  - "Copiar do último treino" preenche os exercícios do treino anterior.
  - **Musculação** tem uma área própria, com cinco abas (`?aba=resumo|fichas|exercicios|progresso|comparar`):
    - Resumo: treinos e volume do mês, o próximo treino do rodízio com "Começar treino", recordes dos últimos 30 dias, séries por semana de cada grupo muscular e a evolução dos exercícios mais feitos.
    - Fichas (Treino A, B, C...): exercícios com séries, faixa de repetições, carga alvo e descanso. A ordem é o rodízio. "Começar treino" abre o registro já com a ficha e as cargas da última vez. Sem fichas, "Criar a partir dos treinos" monta as fichas pelas combinações de exercícios que se repetem.
    - Exercícios: catálogo com equipamento (máquina, halteres, barra, livre, polia, outro) e grupo muscular, busca, filtro por equipamento, a última vez e o recorde. "Juntar com" une nomes repetidos.
    - Progresso (`?ex=<id>`): gráfico por exercício de carga máxima, 1RM estimado (Epley), volume ou repetições, por período, com recordes e histórico de cada série. Exercícios sem carga contam por repetições.
    - Comparar (`?cmp=<id>,<id>`): até cinco exercícios no mesmo gráfico, em evolução % (todos partindo do zero) ou em kg, uma tabela com início, agora e ganho por mês, e as séries de cada grupo muscular mês a mês.
    - O registro do treino tem cada série com repetições e carga, e mostra o que foi feito da última vez. Os treinos antigos continuam valendo: os exercícios deles entram sozinhos no catálogo, ligados pelo nome.
  - **Dança**: um catálogo de passos. Cada passo tem grupo (básicos, giros...), vídeos (link do YouTube, Vimeo, Instagram ou TikTok, ou um vídeo enviado do aparelho), dicas e uma faixa que diz quão bem você faz o passo: Não aprendi, Transparente, Branco, Azul, Roxo, Preto e Vermelho. Cada mudança de faixa fica com a data e vira um gráfico de evolução. Vídeos enviados vão para o bucket privado `nishios-videos` do Supabase (migration `20261119110000_videos.sql`); sem login, ficam só no navegador.
- **Corpo**: peso, gordura corporal e dez medidas, com uma silhueta que mostra o valor atual e a variação de cada uma.
  - Toque em uma medida (ou no peso) para ver o gráfico de evolução. Se houver uma meta ligada, o alvo aparece como linha no gráfico, com o progresso embaixo.
  - "Registrar medidas" aceita só o que foi medido no dia. IMC calculado pela altura.
- **Finanças** (v1, só o que é certo): o resto dos gastos fica de fora de propósito, para não virar planilha de cada centavo.
  - Recorrências: o que entra e sai com certeza (salário, aluguel, contas, assinaturas), todo mês ou a cada tantos meses, em dia corrido (dia 10) ou dia útil (5º dia útil, sem fins de semana, feriados nacionais e Carnaval), com parcelamentos que terminam sozinhos e valor aproximado para contas que variam. Mostra o custo mensal e anual dos fixos e das assinaturas.
  - Previsão: entra, sai, vai para investimentos e sobra do mês, a lista do mês por data e barras com a sobra dos próximos 12 meses (o mês do IPVA aparece apertado). Confirmar e ajustar o valor de um mês são opcionais. No fim da página, "Apagar todos os dados de Finanças" esvazia só este módulo, com Desfazer.
  - Investimentos: saldo atualizado à mão, com histórico e gráfico de evolução. Uma meta pode ser ligada a um investimento (ou ao total) e sobe sozinha; com um aporte recorrente, o cartão mostra quando chega lá.
  - Ligações: camada no calendário, cartão no Início, busca, aviso das contas dos próximos 3 dias no sino, custo fixo na linha do bem e desejos com data como compra planejada na previsão.
- **Bens e desejos**:
  - Meus bens: agrupados por categoria, com valor de compra, data, garantia (avisa quando está acabando) e onde fica. O topo mostra o total.
  - Lista de desejos: preço, prioridade, data pretendida e link. "Comprei" registra a compra e move o item para os bens.
- **Casa**: o apartamento em 3D, montado a partir da planta (cômodos, paredes e a área externa). Começa vazio, só com o que vem da construção: pias, vasos, boxes, tanque, bancada da cozinha, porta da varanda e muro.
  - Duas vistas: **3D** (low-poly, com luz e sombra; arraste para girar e role para aproximar) e **Planta** (vista de cima, a padrão no celular).
  - Clique em um cômodo, ou no nome dele, para a câmera ir até ele: as paredes baixam, o resto da casa fica apagado e os móveis ganham etiqueta.
  - Cada móvel pode ser ligado a um bem de **Bens e desejos**. O painel do cômodo soma o valor e mostra as garantias; ligar um móvel também atualiza o "Onde fica" do bem. "Criar bem novo" cadastra o bem já preenchido a partir do móvel.
  - Sugestões de melhoria por cômodo, mais avisos que saem dos dados (garantia acabando, móveis só na planta).
  - O three.js só é baixado quando a página Casa abre.

![Casa](docs/screenshots/casa.png)

- **Pessoas** (CRM pessoal): família, amigos, trabalho e networking.
  - Cada pessoa tem a frequência com que você quer manter contato; a lista mostra quem está na hora de procurar.
  - "Registrar contato" anota quando e como vocês se falaram. Painel lateral com dados, anotações e histórico.
  - Aniversários dos próximos 30 dias no topo.
- **Pets**: um cartão por pet, com o que ele precisa agora.
  - Vacinas e cuidados (vermífugo, antipulgas...) com a frequência de cada um; a trilha mostra quanto falta e "Marcar como feito" recalcula a próxima data.
  - Saúde: consultas, exames, cirurgias e problemas de saúde, com "Em tratamento" ou "Resolvido".
  - Peso de cada pet em um painel ao lado: o peso atual, a variação, o gráfico e a lista de pesagens.
- **Skills**: hard e soft skills.
  - **Visão geral** (a principal): o que você está estudando agora, com o andamento do plano de estudo e o próximo passo para marcar ali mesmo; o que você já sabe, por nível; e a fila do que quer aprender, com "Começar".
  - **Quadro**: as três colunas (quero aprender, aprendendo, já sei) para arrastar entre elas.
  - Painel lateral com nível de 0 a 5, plano de estudo (passos e links, com progresso) e diário de aprendizado.
- **Culinária**: uma área de aprendizado, não um livro de receitas.
  - Cada receita tem a lista de ingredientes (quantidade, unidade e ingrediente, um por linha da lista, com ordem ajustável; colar várias linhas no campo do ingrediente cria um item por linha), o modo de fazer (um passo por linha), situação (em teste, aprovada, não deu certo), categoria e "O que já aprendi".
  - **Página da receita**: abre para ler e cozinhar, com um resumo (situação, quantas vezes fez, última vez, melhor nota), ingredientes agrupados por parte que você marca enquanto cozinha (a marcação não fica salva), modo de fazer em passos numerados e "O que já aprendi" em tópicos. "Editar" mostra os campos (`&editar=1` na URL); uma receita nova já abre editando.
  - **Partes** (receitas compostas): uma receita pode ser feita de outras, como o Vinagrete, que é a Base de legumes mais o Molho. "Adicionar parte" liga uma receita que já existe ou cria uma nova, com "Quanto vai" (1 receita, metade...). A receita mostra cada parte com os ingredientes dela; a parte mostra "Usada em". Cada parte tem as próprias tentativas e variações, e o app não deixa formar laço (o molho não pode usar o vinagrete que usa o molho). Variações copiam as partes.
  - **Tentativas**: cada vez que cozinhou, com data, nota de 0 a 5, como fez, como ficou e o que mudar na próxima vez. O último "para a próxima vez" aparece em destaque na receita e ao registrar a próxima tentativa.
  - **Variações**: "Criar variação" nasce da receita aberta já com os ingredientes e o modo de fazer dela, e guarda o que muda (Vinagrete padrão, depois Vinagrete com banana, depois com banana e pimenta). A família aparece em árvore na lista e na receita. Uma tentativa pode "Virar variação", e "Variação de" muda a receita de lugar na árvore. Excluir uma receita passa as variações dela para a de cima.
  - A lista é uma tabela: cada receita base em uma linha, com as variações embaixo, recuadas e ligadas por linhas de árvore, e colunas de situação, última vez na cozinha e melhor nota (no celular, viram duas linhas por receita). Ela mostra as famílias pela atividade mais recente, com filtro por situação, busca (também por ingrediente) e "Na cozinha", as últimas tentativas. As tentativas entram no calendário (camada Culinária) e o Início mostra a última vez na cozinha e as receitas em teste. Fica em `?r=<id>` na URL.

![Culinária](docs/screenshots/culinaria-receita.png)

- **Avisos**: o sino no topo lista tudo o que atrasou em qualquer módulo e os compromissos chegando a hora.
- **Integrações entre módulos**:
  - Metas que se atualizam sozinhas: escolha de onde vem o número (treinos, peso, gordura, uma medida do corpo, um hábito ou tarefas concluídas). Metas de baixar um número, como peso e cintura, usam um ponto de partida.
  - Hábitos ligados aos treinos: ficam feitos sozinhos no dia em que o treino é registrado.
  - O calendário, o sino e a agenda do Início leem a mesma lista (`src/modules/calendario/collect.ts`).
  - As regras das ligações ficam em `src/modules/rotina/linked.ts`.
- **Design system**: página `/design-system` com todos os tokens e componentes, e o botão para restaurar os dados de exemplo.

## Design system

Cores e fontes são as mesmas do NishiStack: creme quase branco, Azul Nishi (`#1E3D66`), Inter na interface e Space Grotesk só no nome da marca.

Os tokens têm três camadas:

1. **Primitivas** (`--primitive-*`): a paleta crua. Componentes nunca usam direto.
2. **Semânticas** (`--background`, `--primary`, `--danger`...): o papel de cada cor, mais tipografia, espaçamento, raio, sombra, layout e movimento.
3. **Tema Tailwind**: expõe as semânticas como classes (`bg-surface`, `text-muted-foreground`, `rounded-lg`...).

Para mudar o visual do app inteiro, edite só `src/styles/tokens.css`. O modo escuro é o bloco `.dark` no mesmo arquivo.

Regras que valem para toda página, inclusive as novas:

- **Largura inteira**: o `AppShell` coloca toda página na largura da janela, sem faixas vazias nas laterais (`--page-max-width: none`). Uma página nova não precisa fazer nada para ficar assim.
- **Lista suspensa** (`Select`): própria do design system, no lugar da do navegador. Recebe `<option>` como filhos e devolve `e.target.value`, como um `<select>`. Funciona com setas, Enter e digitando o começo do nome.
- **Seletor de data** (`DatePicker`): `<Input type="date">` já vira ele. Semana começando na segunda, como o calendário do app; toque no mês para pular de mês ou de ano; "Hoje" e "Limpar" no rodapé; setas andam pelos dias.

## Estrutura

```
src/
  styles/
    tokens.css          tokens (primitivas, semânticas, modo escuro)
    index.css           mapeamento para o Tailwind e estilos base
  lib/                  datas, localStorage, tema
  components/
    ui/                 componentes base: Button, Badge, Checkbox, Progress, CycleTrack, LevelDots, LineChart, Avatar,
                        Field, IconPicker, Dialog, Popover, Segmented, Toast, EmptyState
    shell/              AppShell, Sidebar, Notifications, PageHeader, nav.ts
  modules/
    calendario/         junta todos os módulos (collect.ts) e fala com o iPhone (ics.ts)
    tarefas/            cada módulo tem seus tipos, regras (logic.ts),
    rotina/             dados (store.tsx, seed.ts) e telas
    compromissos/
    treinos/
    corpo/
    bens/
    pessoas/
    pets/
    skills/
  pages/                Início e Design system
```

Cada módulo futuro (finanças...) entra como uma pasta em `src/modules/`, uma rota em `src/App.tsx` e uma linha em `src/components/shell/nav.ts`.

Os dados de cada módulo passam todos pelo seu `store.tsx`, que usa `usePersistentState` (`src/lib/storage.ts`). Quando chegar a hora do Supabase, são esses os arquivos que mudam; as telas continuam iguais.

## Telas

| Início | Tarefas em quadro |
| --- | --- |
| ![Início](docs/screenshots/inicio.png) | ![Quadro](docs/screenshots/tarefas-quadro.png) |

| Lista suspensa | Seletor de data |
| --- | --- |
| ![Lista suspensa](docs/screenshots/lista-suspensa.png) | ![Seletor de data](docs/screenshots/seletor-data.png) |

| Busca em tudo | Dados e backup |
| --- | --- |
| ![Busca](docs/screenshots/busca.png) | ![Backup](docs/screenshots/dados.png) |

| Calendário | Semana |
| --- | --- |
| ![Calendário](docs/screenshots/calendario.png) | ![Semana](docs/screenshots/calendario-semana.png) |

| Calendário do iPhone | No celular |
| --- | --- |
| ![iPhone](docs/screenshots/calendario-iphone.png) | ![Celular](docs/screenshots/celular-calendario.png) |

| Rotina e metas | Painel da tarefa |
| --- | --- |
| ![Rotina](docs/screenshots/rotina.png) | ![Tarefa](docs/screenshots/tarefa-painel.png) |

| Treinos | Musculação por dentro |
| --- | --- |
| ![Treinos](docs/screenshots/treinos.png) | ![Musculação](docs/screenshots/treinos-musculacao.png) |

| Corrida por dentro | Registrar treino |
| --- | --- |
| ![Corrida](docs/screenshots/treinos-corrida.png) | ![Registrar treino](docs/screenshots/treino-novo.png) |

| Dança: passos e faixas | Passo por dentro |
| --- | --- |
| ![Dança](docs/screenshots/danca-catalogo.png) | ![Passo](docs/screenshots/danca-depois.png) |

| Dança no celular | Passo no celular |
| --- | --- |
| ![Dança no celular](docs/screenshots/danca-celular.png) | ![Passo no celular](docs/screenshots/danca-passo-celular.png) |

| Corpo | Metas ligadas |
| --- | --- |
| ![Corpo](docs/screenshots/corpo.png) | ![Metas](docs/screenshots/metas-ligadas.png) |

| Pets | Skills |
| --- | --- |
| ![Pets](docs/screenshots/pets.png) | ![Skills](docs/screenshots/skills.png) |

| Bens | Lista de desejos |
| --- | --- |
| ![Bens](docs/screenshots/bens.png) | ![Desejos](docs/screenshots/desejos.png) |

| Pessoas | Painel da pessoa |
| --- | --- |
| ![Pessoas](docs/screenshots/pessoas.png) | ![Pessoa](docs/screenshots/pessoa-painel.png) |

| Compromissos | Painel do compromisso |
| --- | --- |
| ![Compromissos](docs/screenshots/compromissos.png) | ![Painel](docs/screenshots/painel.png) |

| Modo escuro | Design system |
| --- | --- |
| ![Escuro](docs/screenshots/compromissos-escuro.png) | ![Design system](docs/screenshots/design-system.png) |

| Tarefas no celular | Rotina no celular |
| --- | --- |
| ![Tarefas no celular](docs/screenshots/celular-tarefas.png) | ![Rotina no celular](docs/screenshots/celular-rotina.png) |
