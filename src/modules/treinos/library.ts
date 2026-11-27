import type { Equipment, ExerciseDef, MuscleGroup } from "./types";

/**
 * Biblioteca de exercícios que vem com o app. Não fica salva: o catálogo mostra
 * a biblioteca junto com o que você cadastrou (veja `mergeLibrary`). Editar um
 * exercício daqui grava uma cópia sua com o mesmo id; excluir só esconde.
 *
 * Os ids dos exercícios do exemplo antigo (ex-supino-reto, ex-leg-press...) foram
 * mantidos, então fichas e treinos que já usam esses ids continuam ligados.
 */
const e = (
  id: string,
  name: string,
  equipment: Equipment,
  muscle: MuscleGroup,
  notes: string,
  secondary: MuscleGroup[] = [],
): ExerciseDef => ({ id: `ex-${id}`, name, equipment, muscle, notes, ...(secondary.length ? { secondary } : {}) });

export const LIBRARY: ExerciseDef[] = [
  /* ---------------------------------------------------------------- Peito */
  e("supino-reto", "Supino reto", "barra", "peito", "Deitado no banco, pés firmes no chão e escápulas encaixadas. Desça a barra até a linha do mamilo e empurre até estender os braços, sem tirar o quadril do banco.", ["triceps", "ombros"]),
  e("supino-inclinado-barra", "Supino inclinado com barra", "barra", "peito", "Banco a 30–45°. Desça a barra até a parte alta do peito, cotovelos levemente abaixo da linha dos ombros, e empurre de volta.", ["ombros", "triceps"]),
  e("supino-declinado-barra", "Supino declinado com barra", "barra", "peito", "Banco declinado, pernas presas. Desça a barra até a parte baixa do peito e empurre. Enfatiza a porção inferior do peitoral.", ["triceps"]),
  e("supino-reto-halteres", "Supino reto com halteres", "halteres", "peito", "Halteres na linha do peito, punhos neutros. Desça até sentir o alongamento e suba juntando levemente os halteres, sem bater.", ["triceps", "ombros"]),
  e("supino-inclinado-halteres", "Supino inclinado com halteres", "halteres", "peito", "Banco a 30–45°. Desça os halteres ao lado da parte alta do peito e suba em arco. Anote a carga de cada halter.", ["ombros", "triceps"]),
  e("supino-declinado-halteres", "Supino declinado com halteres", "halteres", "peito", "Banco declinado. Desça os halteres até a parte baixa do peito e suba controlando.", ["triceps"]),
  e("supino-maquina", "Supino na máquina", "maquina", "peito", "Ajuste o banco para a pegada ficar na linha do peito. Empurre sem travar os cotovelos e volte devagar.", ["triceps", "ombros"]),
  e("supino-inclinado-maquina", "Supino inclinado na máquina", "maquina", "peito", "Pegada na altura da parte alta do peito. Empurre para cima e para a frente, voltando com controle.", ["ombros", "triceps"]),
  e("supino-smith", "Supino no smith", "maquina", "peito", "Banco centralizado sob a barra do smith. Mesmo movimento do supino reto, com a trajetória guiada.", ["triceps", "ombros"]),
  e("supino-inclinado-smith", "Supino inclinado no smith", "maquina", "peito", "Banco a 30–45° sob o smith. Desça até a parte alta do peito e empurre.", ["ombros", "triceps"]),
  e("crucifixo", "Crucifixo com halteres", "halteres", "peito", "Deitado, braços estendidos acima do peito com cotovelos levemente flexionados. Abra em arco até alongar o peito e feche como se abraçasse uma árvore."),
  e("crucifixo-inclinado", "Crucifixo inclinado com halteres", "halteres", "peito", "Banco a 30°. Abra os braços em arco até alongar a parte alta do peito e feche sem bater os halteres.", ["ombros"]),
  e("crucifixo-maquina", "Crucifixo na máquina (peck deck)", "maquina", "peito", "Costas apoiadas, pegadas na altura do peito. Feche os braços contraindo o peito e volte devagar até alongar."),
  e("crossover-alto", "Crossover polia alta", "polia", "peito", "Polias no alto, um passo à frente, tronco levemente inclinado. Traga as mãos para baixo e para o centro, à frente do quadril."),
  e("crossover-medio", "Crossover polia média", "polia", "peito", "Polias na altura do peito. Feche os braços à frente do peito, cotovelos levemente flexionados."),
  e("crossover-baixo", "Crossover polia baixa", "polia", "peito", "Polias embaixo. Traga as mãos de baixo para cima até a altura do queixo. Enfatiza a parte alta do peito.", ["ombros"]),
  e("flexao", "Flexão de braço", "livre", "peito", "Mãos um pouco mais abertas que os ombros, corpo reto da cabeça aos pés. Desça até o peito quase tocar o chão e empurre.", ["triceps", "ombros", "abdomen"]),
  e("flexao-inclinada", "Flexão inclinada (mãos elevadas)", "livre", "peito", "Mãos num banco ou caixa. Versão mais leve da flexão, boa para começar.", ["triceps"]),
  e("flexao-declinada", "Flexão declinada (pés elevados)", "livre", "peito", "Pés num banco. Versão mais difícil, que puxa para a parte alta do peito.", ["ombros", "triceps"]),
  e("paralelas-peito", "Paralelas (foco no peito)", "livre", "peito", "Tronco inclinado à frente e cotovelos um pouco abertos. Desça até os ombros ficarem na linha dos cotovelos e suba.", ["triceps", "ombros"]),
  e("pullover-halter", "Pullover com halter", "halteres", "peito", "Deitado transversal ou ao longo do banco, halter acima do peito com as duas mãos. Leve-o para trás da cabeça em arco e volte.", ["costas"]),

  /* --------------------------------------------------------------- Costas */
  e("barra-fixa", "Barra fixa", "livre", "costas", "Pegada pronada, um pouco mais aberta que os ombros. Puxe até o queixo passar a barra e desça até estender os braços.", ["biceps"]),
  e("barra-fixa-supinada", "Barra fixa supinada (chin-up)", "livre", "costas", "Palmas para você, pegada na largura dos ombros. Puxe até o queixo passar a barra. Trabalha mais o bíceps.", ["biceps"]),
  e("barra-fixa-graviton", "Barra fixa no graviton", "maquina", "costas", "Barra fixa com contrapeso. Anote o peso de assistência: quanto menor, mais difícil.", ["biceps"]),
  e("puxada-frontal", "Puxada frontal", "polia", "costas", "Pegada aberta, peito estufado. Puxe a barra até a parte alta do peito levando os cotovelos para baixo e para trás.", ["biceps"]),
  e("puxada-supinada", "Puxada supinada", "polia", "costas", "Pegada supinada na largura dos ombros. Puxe até o peito com os cotovelos junto ao corpo.", ["biceps"]),
  e("puxada-triangulo", "Puxada com triângulo", "polia", "costas", "Pegada neutra fechada. Puxe o triângulo até o peito, inclinando levemente o tronco para trás.", ["biceps"]),
  e("puxada-unilateral", "Puxada unilateral na polia", "polia", "costas", "Um braço por vez, com pegador. Puxe o cotovelo para baixo e para o lado do corpo."),
  e("pulldown-braco-estendido", "Pulldown com braços estendidos", "polia", "costas", "Em pé, polia alta com barra ou corda. Braços quase estendidos, traga a barra até as coxas usando as costas."),
  e("remada-curvada", "Remada curvada", "barra", "costas", "Tronco inclinado a uns 45°, coluna neutra e joelhos levemente flexionados. Puxe a barra até o umbigo e desça controlando.", ["biceps", "posterior"]),
  e("remada-curvada-supinada", "Remada curvada supinada", "barra", "costas", "Igual à remada curvada, com pegada supinada. Puxe até a parte baixa do abdômen.", ["biceps"]),
  e("remada-cavalinho", "Remada cavalinho (barra T)", "barra", "costas", "Barra presa num canto ou no aparelho de remada T. Tronco inclinado, puxe o pegador até o peito.", ["biceps"]),
  e("remada-unilateral", "Remada unilateral com halter (serrote)", "halteres", "costas", "Mão e joelho apoiados no banco. Puxe o halter até o quadril, cotovelo junto ao corpo.", ["biceps"]),
  e("remada-baixa", "Remada baixa no cabo", "polia", "costas", "Sentado, pés apoiados, coluna reta. Puxe o triângulo até o abdômen juntando as escápulas e volte alongando.", ["biceps"]),
  e("remada-alta-cabo", "Remada aberta no cabo", "polia", "costas", "Sentado, pegada aberta na barra. Puxe até a altura do peito com os cotovelos abertos. Pega também o deltoide posterior.", ["ombros"]),
  e("remada-maquina", "Remada na máquina", "maquina", "costas", "Peito apoiado no encosto. Puxe os pegadores juntando as escápulas e volte devagar.", ["biceps"]),
  e("remada-articulada", "Remada articulada", "maquina", "costas", "Máquina de alavanca (Hammer). Puxe com os cotovelos para trás, um braço por vez ou os dois.", ["biceps"]),
  e("remada-invertida", "Remada invertida", "livre", "costas", "Deitado sob uma barra baixa ou argolas, corpo reto. Puxe o peito até a barra.", ["biceps"]),
  e("levantamento-terra", "Levantamento terra", "barra", "costas", "Barra sobre o meio do pé, coluna neutra, quadril entre joelhos e ombros. Empurre o chão e estenda quadril e joelhos juntos, barra rente ao corpo.", ["posterior", "gluteos", "quadriceps"]),
  e("rack-pull", "Rack pull (terra parcial)", "barra", "costas", "Terra começando com a barra apoiada no rack, na altura do joelho. Permite mais carga na parte final.", ["gluteos", "posterior"]),
  e("hiperextensao", "Hiperextensão lombar", "maquina", "costas", "No banco romano, quadril apoiado. Desça o tronco com a coluna neutra e suba até alinhar com as pernas, sem hiperestender.", ["gluteos", "posterior"]),
  e("good-morning", "Good morning", "barra", "costas", "Barra nas costas, joelhos levemente flexionados. Incline o tronco à frente levando o quadril para trás e volte.", ["posterior", "gluteos"]),

  /* --------------------------------------------------------------- Ombros */
  e("desenvolvimento", "Desenvolvimento", "barra", "ombros", "Em pé ou sentado, barra à frente na altura da clavícula. Empurre acima da cabeça até estender os braços.", ["triceps"]),
  e("desenvolvimento-halteres", "Desenvolvimento com halteres", "halteres", "ombros", "Sentado com encosto, halteres na altura das orelhas. Empurre para cima sem bater os halteres.", ["triceps"]),
  e("desenvolvimento-arnold", "Desenvolvimento Arnold", "halteres", "ombros", "Comece com os halteres à frente do rosto, palmas para você. Gire as palmas para a frente enquanto empurra para cima.", ["triceps"]),
  e("desenvolvimento-maquina", "Desenvolvimento na máquina", "maquina", "ombros", "Pegadores na altura dos ombros. Empurre para cima sem travar e volte devagar.", ["triceps"]),
  e("desenvolvimento-smith", "Desenvolvimento no smith", "maquina", "ombros", "Sentado sob o smith, barra à frente do rosto. Empurre até estender os braços.", ["triceps"]),
  e("elevacao-lateral", "Elevação lateral", "halteres", "ombros", "Em pé, cotovelos levemente flexionados. Eleve os braços pelos lados até a altura dos ombros, sem balançar o tronco."),
  e("elevacao-lateral-cabo", "Elevação lateral no cabo", "polia", "ombros", "Polia baixa, cabo passando pela frente do corpo. Eleve o braço pelo lado até a altura do ombro. Tensão constante."),
  e("elevacao-lateral-maquina", "Elevação lateral na máquina", "maquina", "ombros", "Cotovelos apoiados nas almofadas. Eleve até a altura dos ombros e desça controlando."),
  e("elevacao-frontal", "Elevação frontal", "halteres", "ombros", "Eleve os halteres à frente até a altura dos olhos, alternando ou juntos, sem balançar.", ["peito"]),
  e("elevacao-frontal-anilha", "Elevação frontal com anilha", "outro", "ombros", "Segure a anilha pelas laterais e eleve à frente até a altura dos olhos.", ["peito"]),
  e("crucifixo-invertido", "Crucifixo invertido com halteres", "halteres", "ombros", "Tronco inclinado à frente quase paralelo ao chão. Abra os braços pelos lados juntando as escápulas. Trabalha o deltoide posterior.", ["costas"]),
  e("crucifixo-invertido-maquina", "Crucifixo invertido na máquina", "maquina", "ombros", "De frente para o encosto do peck deck. Abra os braços para trás com cotovelos levemente flexionados.", ["costas"]),
  e("face-pull", "Face pull", "polia", "ombros", "Polia alta com corda. Puxe em direção ao rosto abrindo as mãos e girando os ombros para fora. Ótimo para postura.", ["costas"]),
  e("remada-alta", "Remada alta", "barra", "ombros", "Barra ou halteres à frente das coxas, pegada fechada. Puxe até a altura do peito com os cotovelos acima das mãos.", ["costas"]),
  e("encolhimento", "Encolhimento com halteres", "halteres", "costas", "Em pé, braços estendidos. Suba os ombros em direção às orelhas, segure um instante e desça. Trabalha o trapézio."),
  e("encolhimento-barra", "Encolhimento com barra", "barra", "costas", "Barra à frente das coxas. Suba os ombros em direção às orelhas sem girar."),

  /* --------------------------------------------------------------- Bíceps */
  e("rosca-direta", "Rosca direta", "barra", "biceps", "Em pé, cotovelos junto ao corpo. Flexione os braços até a barra chegar perto do peito e desça devagar, sem balançar.", ["antebraco"]),
  e("rosca-barra-w", "Rosca com barra W", "barra", "biceps", "Mesma rosca direta na barra W, que alivia os punhos.", ["antebraco"]),
  e("rosca-alternada", "Rosca alternada", "halteres", "biceps", "Um braço por vez, girando a palma para cima durante a subida.", ["antebraco"]),
  e("rosca-martelo", "Rosca martelo", "halteres", "biceps", "Pegada neutra (palmas para dentro). Flexione o cotovelo sem girar o punho. Trabalha braquial e antebraço.", ["antebraco"]),
  e("rosca-concentrada", "Rosca concentrada", "halteres", "biceps", "Sentado, cotovelo apoiado na parte interna da coxa. Suba o halter até o ombro e desça devagar."),
  e("rosca-scott", "Rosca Scott", "barra", "biceps", "Braços apoiados no banco Scott. Desça até quase estender e suba sem tirar os cotovelos do apoio."),
  e("rosca-scott-maquina", "Rosca Scott na máquina", "maquina", "biceps", "Braços no apoio da máquina. Flexione e estenda com controle."),
  e("rosca-inclinada", "Rosca inclinada com halteres", "halteres", "biceps", "Recostado num banco a 45°, braços pendurados. Faça a rosca sem levar os cotovelos à frente. Alonga bem o bíceps."),
  e("rosca-cabo", "Rosca no cabo", "polia", "biceps", "Polia baixa com barra reta ou W. Rosca com tensão constante."),
  e("rosca-corda", "Rosca martelo na corda", "polia", "biceps", "Polia baixa com corda, pegada neutra. Suba as mãos até a altura dos ombros.", ["antebraco"]),
  e("rosca-spider", "Rosca spider", "halteres", "biceps", "Peito apoiado num banco inclinado, braços pendurados à frente. Rosca curta e contraída."),

  /* -------------------------------------------------------------- Tríceps */
  e("triceps-polia", "Tríceps na polia", "polia", "triceps", "Polia alta com barra. Cotovelos colados ao corpo, estenda os braços até o fim e volte até a altura do peito."),
  e("triceps-corda", "Tríceps corda", "polia", "triceps", "Polia alta com corda. Estenda os braços abrindo a corda no final do movimento."),
  e("triceps-polia-inverso", "Tríceps na polia pegada invertida", "polia", "triceps", "Barra reta com pegada supinada. Estenda os braços com os cotovelos fixos."),
  e("triceps-testa", "Tríceps testa", "barra", "triceps", "Deitado, barra W acima do peito. Flexione só os cotovelos levando a barra até a testa e estenda."),
  e("triceps-frances", "Tríceps francês", "halteres", "triceps", "Sentado ou em pé, halter atrás da cabeça com as duas mãos. Estenda os braços acima da cabeça sem abrir os cotovelos."),
  e("triceps-frances-cabo", "Tríceps francês na polia", "polia", "triceps", "De costas para a polia, corda atrás da cabeça. Estenda os braços à frente e acima."),
  e("triceps-coice", "Tríceps coice", "halteres", "triceps", "Tronco inclinado, cotovelo junto ao corpo e alto. Estenda o braço para trás e volte."),
  e("triceps-unilateral-cabo", "Tríceps unilateral no cabo", "polia", "triceps", "Um braço por vez, com pegador. Estenda o braço até o fim com o cotovelo parado."),
  e("supino-fechado", "Supino fechado", "barra", "triceps", "Pegada na largura dos ombros, cotovelos junto ao corpo. Desça até a parte baixa do peito e empurre.", ["peito"]),
  e("paralelas", "Paralelas (foco no tríceps)", "livre", "triceps", "Tronco ereto, cotovelos junto ao corpo. Desça até 90° nos cotovelos e suba estendendo.", ["peito", "ombros"]),
  e("mergulho-banco", "Mergulho no banco", "livre", "triceps", "Mãos no banco atrás do corpo, pernas à frente. Desça flexionando os cotovelos e suba.", ["ombros"]),
  e("triceps-maquina", "Tríceps na máquina", "maquina", "triceps", "Máquina de paralela sentada ou extensão. Estenda os braços com os cotovelos fixos."),
  e("flexao-diamante", "Flexão diamante", "livre", "triceps", "Flexão com as mãos juntas formando um losango sob o peito.", ["peito"]),

  /* ------------------------------------------------------------ Antebraço */
  e("rosca-punho", "Rosca de punho", "barra", "antebraco", "Antebraços apoiados nas coxas, palmas para cima. Flexione só os punhos."),
  e("rosca-punho-inversa", "Rosca de punho inversa", "barra", "antebraco", "Antebraços apoiados, palmas para baixo. Estenda os punhos para cima."),
  e("rosca-inversa", "Rosca inversa", "barra", "antebraco", "Rosca com pegada pronada (palmas para baixo).", ["biceps"]),
  e("farmer-walk", "Caminhada do fazendeiro", "halteres", "antebraco", "Halteres pesados nas mãos, ombros para trás. Caminhe uma distância ou um tempo. Conte as repetições como metros ou segundos.", ["costas", "abdomen"]),
  e("pendurar-barra", "Pendurar na barra", "livre", "antebraco", "Pendure na barra fixa com braços estendidos o máximo de tempo. Conte as repetições como segundos.", ["costas"]),

  /* -------------------------------------------------------------- Abdômen */
  e("prancha", "Prancha", "livre", "abdomen", "Antebraços no chão, corpo reto da cabeça aos pés, abdômen e glúteos contraídos. Conte as repetições como segundos."),
  e("prancha-lateral", "Prancha lateral", "livre", "abdomen", "Apoiado num antebraço, corpo de lado e reto. Conte as repetições como segundos, cada lado."),
  e("abdominal-supra", "Abdominal supra (crunch)", "livre", "abdomen", "Deitado, joelhos flexionados. Tire as escápulas do chão enrolando o tronco, sem puxar o pescoço."),
  e("abdominal-infra", "Abdominal infra", "livre", "abdomen", "Deitado, mãos ao lado do quadril. Eleve as pernas e tire o quadril do chão no final."),
  e("abdominal-bicicleta", "Abdominal bicicleta", "livre", "abdomen", "Deitado, leve o cotovelo ao joelho oposto alternando, como se pedalasse."),
  e("abdominal-remador", "Abdominal remador", "livre", "abdomen", "Sentado, tronco e pernas se aproximam e se afastam ao mesmo tempo, braços acompanhando."),
  e("abdominal-polia", "Abdominal na polia (crunch ajoelhado)", "polia", "abdomen", "Ajoelhado, corda na nuca. Enrole o tronco levando os cotovelos aos joelhos, sem sentar no calcanhar."),
  e("abdominal-maquina", "Abdominal na máquina", "maquina", "abdomen", "Ajuste a carga e enrole o tronco contraindo o abdômen."),
  e("elevacao-pernas", "Elevação de pernas pendurado", "livre", "abdomen", "Pendurado na barra, eleve as pernas (ou os joelhos) até a altura do quadril ou mais, sem balançar."),
  e("elevacao-pernas-paralela", "Elevação de joelhos na paralela", "livre", "abdomen", "Antebraços no apoio do aparelho de paralela. Eleve os joelhos até o peito."),
  e("roda-abdominal", "Roda abdominal", "outro", "abdomen", "Ajoelhado, role a roda à frente mantendo o abdômen firme e volte sem arquear a lombar."),
  e("russian-twist", "Russian twist", "livre", "abdomen", "Sentado, pés fora do chão, tronco inclinado. Gire o tronco de um lado ao outro, com ou sem peso."),
  e("dead-bug", "Dead bug", "livre", "abdomen", "Deitado, braços e joelhos para cima. Estenda braço e perna opostos sem tirar a lombar do chão."),
  e("pallof-press", "Pallof press", "polia", "abdomen", "De lado para a polia, pegador no peito. Empurre à frente e segure sem deixar o tronco girar. Anti-rotação."),
  e("mountain-climber", "Escalador (mountain climber)", "livre", "abdomen", "Em posição de flexão, leve os joelhos ao peito alternando rápido. Conte como segundos ou repetições.", ["corpo"]),

  /* ----------------------------------------------------------- Quadríceps */
  e("agachamento-livre", "Agachamento livre", "barra", "quadriceps", "Barra no trapézio, pés na largura dos ombros. Desça levando o quadril para trás e para baixo até pelo menos 90°, joelhos na direção dos pés, e suba.", ["gluteos", "posterior"]),
  e("agachamento-frontal", "Agachamento frontal", "barra", "quadriceps", "Barra apoiada na frente dos ombros, cotovelos altos. Tronco mais ereto que no agachamento livre.", ["gluteos", "abdomen"]),
  e("agachamento-smith", "Agachamento no smith", "maquina", "quadriceps", "Pés um pouco à frente da barra. Desça até 90° ou mais e suba com a trajetória guiada.", ["gluteos"]),
  e("agachamento-goblet", "Agachamento goblet", "halteres", "quadriceps", "Halter ou kettlebell junto ao peito. Agache fundo com o tronco ereto. Ótimo para aprender o movimento.", ["gluteos"]),
  e("agachamento-hack", "Agachamento hack", "maquina", "quadriceps", "Costas no encosto da máquina hack. Desça até 90° ou mais e empurre pelos calcanhares.", ["gluteos"]),
  e("agachamento-bulgaro", "Agachamento búlgaro", "halteres", "quadriceps", "Pé de trás apoiado num banco. Desça o joelho de trás em direção ao chão e suba pela perna da frente.", ["gluteos"]),
  e("agachamento-sumo", "Agachamento sumô", "halteres", "quadriceps", "Pés bem afastados e virados para fora, halter entre as pernas. Desça com os joelhos abertos.", ["gluteos"]),
  e("agachamento-peso-corpo", "Agachamento livre sem peso", "livre", "quadriceps", "Agachamento só com o peso do corpo, braços à frente para equilibrar.", ["gluteos"]),
  e("leg-press", "Leg press", "maquina", "quadriceps", "Leg 45°. Pés na largura do quadril no meio da plataforma. Desça até 90° sem tirar o quadril do banco. A carga é só das anilhas.", ["gluteos"]),
  e("leg-press-horizontal", "Leg press horizontal", "maquina", "quadriceps", "Sentado, empurre a plataforma até quase estender os joelhos e volte devagar.", ["gluteos"]),
  e("cadeira-extensora", "Cadeira extensora", "maquina", "quadriceps", "Eixo da máquina alinhado ao joelho. Estenda as pernas até o fim, segure um instante e desça devagar."),
  e("afundo", "Afundo (passada parada)", "halteres", "quadriceps", "Um pé à frente e outro atrás. Desça o joelho de trás em direção ao chão e suba, sem o joelho da frente passar muito da ponta do pé.", ["gluteos"]),
  e("avanco", "Avanço (passada andando)", "halteres", "quadriceps", "Dê passos largos à frente, descendo o joelho de trás a cada passo. Conte as repetições por perna.", ["gluteos"]),
  e("subida-banco", "Subida no banco (step-up)", "halteres", "quadriceps", "Suba num banco ou caixa com uma perna, sem impulso da perna de baixo, e desça controlando.", ["gluteos"]),
  e("sissy-squat", "Sissy squat", "livre", "quadriceps", "Segurando num apoio, incline o tronco para trás e leve os joelhos à frente, descendo nas pontas dos pés."),
  e("agachamento-pistol", "Agachamento unilateral (pistol)", "livre", "quadriceps", "Numa perna só, a outra estendida à frente. Desça o mais fundo que conseguir com controle.", ["gluteos"]),

  /* ------------------------------------------------------------ Posterior */
  e("mesa-flexora", "Mesa flexora", "maquina", "posterior", "Deitado de bruços, eixo alinhado ao joelho. Flexione as pernas levando o rolo até o glúteo e desça devagar."),
  e("cadeira-flexora", "Cadeira flexora", "maquina", "posterior", "Sentado, rolo atrás dos tornozelos. Flexione os joelhos ao máximo e volte controlando."),
  e("flexora-em-pe", "Flexora em pé unilateral", "maquina", "posterior", "Em pé na máquina, uma perna por vez. Flexione o joelho levando o calcanhar ao glúteo."),
  e("stiff", "Stiff", "barra", "posterior", "Pernas quase estendidas, coluna neutra. Desça a barra rente às pernas levando o quadril para trás até alongar o posterior e suba.", ["gluteos", "costas"]),
  e("stiff-halteres", "Stiff com halteres", "halteres", "posterior", "Mesmo movimento do stiff, com um halter em cada mão.", ["gluteos"]),
  e("terra-romeno", "Levantamento terra romeno", "barra", "posterior", "Joelhos levemente flexionados e fixos. Leve o quadril para trás descendo a barra até abaixo do joelho e volte contraindo o glúteo.", ["gluteos", "costas"]),
  e("stiff-unilateral", "Stiff unilateral", "halteres", "posterior", "Numa perna só, a outra vai para trás enquanto o tronco desce. Trabalha também o equilíbrio.", ["gluteos"]),
  e("flexao-nordica", "Flexão nórdica", "livre", "posterior", "Ajoelhado, tornozelos presos. Desça o tronco à frente o mais devagar possível e volte."),
  e("flexora-bola", "Flexão de joelhos na bola", "outro", "posterior", "Deitado, calcanhares na bola suíça e quadril elevado. Puxe a bola em direção ao glúteo.", ["gluteos"]),

  /* -------------------------------------------------------------- Glúteos */
  e("elevacao-pelvica", "Elevação pélvica (hip thrust)", "barra", "gluteos", "Costas apoiadas num banco, barra no quadril com proteção. Suba o quadril até alinhar tronco e coxas, contraia o glúteo e desça.", ["posterior"]),
  e("elevacao-pelvica-maquina", "Elevação pélvica na máquina", "maquina", "gluteos", "Mesmo movimento do hip thrust, na máquina própria.", ["posterior"]),
  e("ponte-gluteo", "Ponte de glúteo", "livre", "gluteos", "Deitado, joelhos flexionados. Suba o quadril contraindo o glúteo e desça. Pode usar anilha ou halter no quadril.", ["posterior"]),
  e("gluteo-cabo", "Glúteo no cabo (coice)", "polia", "gluteos", "Tornozeleira na polia baixa. Leve a perna estendida para trás contraindo o glúteo, sem arquear a lombar."),
  e("gluteo-maquina", "Glúteo na máquina", "maquina", "gluteos", "Máquina de glúteo (coice). Empurre a plataforma para trás com o calcanhar."),
  e("gluteo-quatro-apoios", "Glúteo quatro apoios", "livre", "gluteos", "De quatro, leve uma perna flexionada para cima até a coxa alinhar com o tronco. Pode usar caneleira."),
  e("cadeira-abdutora", "Cadeira abdutora", "maquina", "gluteos", "Sentado, abra as pernas contra a resistência e volte devagar. Trabalha glúteo médio."),
  e("cadeira-adutora", "Cadeira adutora", "maquina", "quadriceps", "Sentado, feche as pernas contra a resistência. Trabalha a parte interna da coxa (adutores)."),
  e("abducao-cabo", "Abdução de quadril no cabo", "polia", "gluteos", "De lado para a polia baixa, tornozeleira na perna de fora. Leve a perna para o lado."),
  e("abducao-elastico", "Abdução com elástico", "outro", "gluteos", "Elástico acima dos joelhos. Abra os joelhos sentado, deitado de lado ou em semiagachamento."),
  e("passada-lateral-elastico", "Caminhada lateral com elástico", "outro", "gluteos", "Elástico nos joelhos ou tornozelos, semiagachado. Dê passos laterais sem juntar os pés."),
  e("pull-through", "Pull-through no cabo", "polia", "gluteos", "De costas para a polia baixa, corda entre as pernas. Estenda o quadril à frente contraindo o glúteo.", ["posterior"]),

  /* ---------------------------------------------------------- Panturrilha */
  e("panturrilha", "Panturrilha em pé", "maquina", "panturrilha", "Pontas dos pés no degrau. Suba o máximo, segure um instante e desça até alongar bem o calcanhar."),
  e("panturrilha-sentado", "Panturrilha sentado", "maquina", "panturrilha", "Sentado, joelhos sob o apoio. Suba e desça na ponta dos pés. Trabalha mais o sóleo."),
  e("panturrilha-leg", "Panturrilha no leg press", "maquina", "panturrilha", "Pontas dos pés na borda da plataforma, joelhos estendidos. Empurre com os tornozelos."),
  e("panturrilha-smith", "Panturrilha no smith", "maquina", "panturrilha", "Barra do smith nas costas, pontas dos pés num step. Suba e desça com amplitude total."),
  e("panturrilha-unilateral", "Panturrilha unilateral com halter", "halteres", "panturrilha", "Numa perna só, num degrau, segurando um halter. Suba e desça devagar."),
  e("panturrilha-livre", "Panturrilha em pé sem peso", "livre", "panturrilha", "Num degrau, só com o peso do corpo. Bom para aquecer ou treinar em casa."),

  /* ---------------------------------------------------------- Corpo todo */
  e("burpee", "Burpee", "livre", "corpo", "Agache, apoie as mãos, jogue os pés para trás, faça uma flexão, volte e salte. Conte as repetições."),
  e("kettlebell-swing", "Kettlebell swing", "outro", "corpo", "Pés afastados, leve o kettlebell entre as pernas e projete o quadril à frente para balançá-lo até a altura do peito.", ["gluteos", "posterior"]),
  e("thruster", "Thruster", "barra", "corpo", "Agachamento frontal seguido direto de um desenvolvimento, num movimento só.", ["quadriceps", "ombros"]),
  e("clean", "Power clean", "barra", "corpo", "Puxe a barra do chão de forma explosiva e receba-a na frente dos ombros. Peça orientação para aprender.", ["posterior", "costas", "ombros"]),
  e("snatch-halter", "Arranco com halter", "halteres", "corpo", "Do chão até acima da cabeça num movimento explosivo, um braço por vez.", ["ombros", "posterior"]),
  e("turkish-get-up", "Levantamento turco", "outro", "corpo", "Deitado com kettlebell estendido acima, levante-se até ficar em pé mantendo o peso no alto, e volte.", ["ombros", "abdomen"]),
  e("battle-rope", "Corda naval (battle rope)", "outro", "corpo", "Ondas alternadas ou simultâneas com as cordas. Conte as repetições como segundos.", ["ombros"]),
  e("sled-push", "Empurrar trenó", "outro", "corpo", "Empurre o trenó com o corpo inclinado e passos curtos. Conte as repetições como metros.", ["quadriceps", "gluteos"]),
  e("box-jump", "Salto na caixa", "livre", "corpo", "Salte com os dois pés sobre uma caixa e desça com cuidado, um pé de cada vez.", ["quadriceps", "gluteos"]),
  e("polichinelo", "Polichinelo", "livre", "corpo", "Salte abrindo pernas e braços e volte. Bom para aquecer. Conte como repetições ou segundos."),
  e("pular-corda", "Pular corda", "outro", "corpo", "Saltos curtos na ponta dos pés. Conte as repetições como segundos.", ["panturrilha"]),
];

export const LIBRARY_BY_ID = new Map(LIBRARY.map((d) => [d.id, d]));
