| INSTITUTO            | FEDERAL       | DE EDUCAÇÃO,CIÊNCIA |                    | E TECNOLOGIA |
| -------------------- | ------------- | ------------------- | ------------------ | ------------ |
|                      |               | DE SÃO              | PAULO              |              |
|                      |               | CAMPUS              | SALTO              |              |
|                      | MarioHenrique |                     | Martins Alves      | Pedrao       |
|                      |               | AdrianoCamocardi    | Junior             |              |
|                      | ErickHenrique |                     | Toaliari Fortunato |              |
| MARGEM.AI:ASSISTENTE |               |                     | DE DECISÕES        | FINANCEIRAS  |
Salto
2026

|                      | MarioHenrique    | Martins Alves | Pedrao       |             |              |           |
| -------------------- | ---------------- | ------------- | ------------ | ----------- | ------------ | --------- |
|                      | AdrianoCamocardi |               | Junior       |             |              |           |
|                      | ErickHenrique    | Toaliari      | Fortunato    |             |              |           |
| MARGEM.AI:ASSISTENTE |                  | DE DECISÕES   |              | FINANCEIRAS |              |           |
|                      |                  | Relatório     | Científico   | apresentado | ao           | Instituto |
|                      |                  | Federal       | de Educação, | Ciência     | e Tecnologia | de São    |
Paulo–CampusSaltocomopartedosrequisitosda
|     |     | disciplina | Projeto | Integrador | 1 do curso | de Análise |
| --- | --- | ---------- | ------- | ---------- | ---------- | ---------- |
eDesenvolvimentodeSistemas.
Orientadores:
Prof.Me.FranciscoDiegoGarridodaSilva
Prof.Dr.PauloSérgioPrampero
Salto
2026

RESUMO
OprojetoMargem.AIpropõeodesenvolvimentodeumassistentedegestãofinanceira
voltado especificamente para Microempreendedores Individuais (MEIs) brasileiros. O
problema central abordado é a dificuldade de gestão de fluxo de caixa e precificação
enfrentada por pequenos empreendedores que não possuem formação financeira. A
solução combina a precisão de ferramentas de alta performance com uma interface
simplificada, utilizando diretrizes de mercado e conteúdos do SEBRAE para embasar
a tomada de decisão. A metodologia de desenvolvimento seguirá práticas ágeis, com
foco em histórias de usuário e ciclos rigorosos de testes funcionais. Espera-se como
resultado uma aplicação web capaz de automatizar o cálculo de margens e fornecer
insights financeiros estratégicos, com potencial de reduzir em pelo menos 50% o
tempo gasto pelo empreendedor em fechamentos mensais, eliminando erros comuns
em fórmulas de planilhas manuais.
Palavras-chave: Microempreendedor Individual. Gestão Financeira. Fluxo de Caixa.
Precificação. Inteligência de Dados.

|         |                   |          |               | LISTA         | DE ILUSTRAÇÕES  |         |          |
| ------- | ----------------- | -------- | ------------- | ------------- | --------------- | ------- | -------- |
| (Não há | figuras           | nesta    | versão        | inicial       | do relatório.)  |         |          |
|         |                   |          |               |               | LISTA DE        | TABELAS |          |
| Tabela  | 1 – Metas         |          | estabelecidas |               | para o projeto  |         |          |
| Tabela  | 2 – Cronograma    |          |               | de atividades |                 |         |          |
| Tabela  | 3 – Assinaturas   |          | dos           | integrantes   |                 |         |          |
|         |                   |          | LISTA         | DE            | ABREVIATURAS    |         | E SIGLAS |
| API     | Application       |          | Programming   |               | Interface       |         |          |
| DDD     | Domain-Driven     |          | Design        |               |                 |         |          |
| ERP     | Enterprise        | Resource |               | Planning      |                 |         |          |
| MEI     | Microempreendedor |          |               | Individual    |                 |         |          |
| MEP     | Microempresa      |          | e Empresa     |               | de Pequeno      | Porte   |          |
| MVP     | Minimum           | Viable   | Product       |               | (Produto Mínimo |         | Viável)  |
| PWA     | Progressive       |          | Web           | Application   |                 |         |          |
| SAD     | Sistema           | de       | Apoio         | à Decisão     |                 |         |          |
SEBRAE Serviço Brasileiro de Apoio às Micro e Pequenas Empresas
TDD Test Driven Development (Desenvolvimento Orientado a Testes)

SUMÁRIO
1 INTRODUÇÃO
|                | 1.1 Apresentação | do            | Projeto         |             |
| -------------- | ---------------- | ------------- | --------------- | ----------- |
|                | 1.2 Objetivos    |               |                 |             |
| 2 REVISÃO      | DA               | LITERATURA    |                 |             |
|                | 2.1 Gestão       | Financeira    | para            | MEIs        |
|                | 2.2 Sistemas     | de Apoio      | à Decisão       |             |
|                | 2.3 Tecnologias  | e Arquitetura |                 | de Software |
| 3 SOLUÇÃO      | ADOTADA          |               |                 |             |
|                | 3.1 Metodologia  | de            | Desenvolvimento |             |
|                | 3.2 Modelo       | da Solução    |                 |             |
|                | 3.3 Viabilidade  | de Execução   |                 |             |
| 4 PLANEJAMENTO |                  | DE ATIVIDADES |                 |             |
REFERÊNCIAS
| APÊNDICE | A –          | Detalhamento | das | Funcionalidades |
| -------- | ------------ | ------------ | --- | --------------- |
| ANEXO    | A – Proposta | de Trabalho  |     | Original        |

6
1 INTRODUÇÃO
O cenário empreendedor brasileiro é marcado por um elevado índice de
mortalidade de microempresas, especialmente nos primeiros anos de operação.
Segundo o SEBRAE (2016), a gestão financeira deficiente figura invariavelmente
entre as principais causas desse fenômeno. O Microempreendedor Individual (MEI)
opera, na maioria das vezes, sob o que se pode chamar de solidão gerencial: a rotina
operacional consome o tempo que deveria ser dedicado à estratégia, à análise de
custos e à tomada de decisões financeiras fundamentadas.
Nesse contexto, o projeto Margem.AI nasce da observação direta das
dificuldades práticas enfrentadas por comerciantes e prestadores de serviço de
pequeno porte. Decisões cotidianas, como conceder um desconto, parcelar uma
venda ou aceitar uma proposta de fornecedor, são tomadas na velocidade do balcão,
sem que o empreendedor disponha de ferramentas adequadas para avaliar o real
impacto dessas escolhas sobre sua margem de lucro.
Este relatório apresenta o desenvolvimento do Margem.AI, um assistente de
decisõesfinanceiraspara MEIsque automatiza cálculoscomplexose fornece insights
estratégicos baseados em dados reais do negócio e em inteligência de mercado
consolidada pelo SEBRAE. O documento está organizado em quatro capítulos:
Introdução, Revisão da Literatura, Solução Adotada e Planejamento de Atividades.
1.1 Apresentação do Projeto
O Margem.AI é uma aplicação web voltada ao público MEI, segmento que,
conforme dados do SEBRAE (2016), responde por parcela significativa dos
empreendimentos ativos no Brasil, mas que apresenta alta vulnerabilidade à
descapitalização por má gestão do fluxo de caixa e erro sistemático na precificação
de produtos e serviços.
A proposta central do projeto é substituir, ou complementar, o uso de planilhas
manuais e processos informais de controle financeiro por uma interface intuitiva que
processe informações de vendas em tempo real. O sistema atua como um árbitro de

7
margens: antes de concretizar uma operação comercial, o MEI poderá consultar o
assistente e obter, de forma imediata, o lucro líquido estimado após a dedução de
| todas | as  | taxas, impostos |     | e custos | invisíveis | envolvidos. |     |
| ----- | --- | --------------- | --- | -------- | ---------- | ----------- | --- |
O projeto é desenvolvido no âmbito da disciplina Projeto Integrador 1 (PI1) do
curso de Análise e Desenvolvimento de Sistemas do Instituto Federal de Educação,
Ciência e Tecnologia de São Paulo, Campus Salto, sob orientação dos professores
| Francisco |     | Diego | Garrido | da  | Silva e Paulo | Sérgio Prampero. |     |
| --------- | --- | ----- | ------- | --- | ------------- | ---------------- | --- |
1.2 Objetivos
O objetivo geral do projeto é desenvolver o Margem.AI, um assistente de
decisões financeiras para MEIs que automatiza cálculos complexos de precificação
e margem de lucro e fornece insights estratégicos baseados em dados reais do
| negócio | e   | em inteligência |             | de  | mercado. |     |     |
| ------- | --- | --------------- | ----------- | --- | -------- | --- | --- |
|         | Os  | objetivos       | específicos |     | são:     |     |     |
- Desenvolver um motor de cálculo para precificação e margem de lucro
|     | baseado |     | em custos | fixos | e variáveis; |     |     |
| --- | ------- | --- | --------- | ----- | ------------ | --- | --- |
- Implementar um dashboard simplificado para visualização de fluxo de caixa
|     | em  | tempo | real; |     |     |     |     |
| --- | --- | ----- | ----- | --- | --- | --- | --- |
- Integrar diretrizes de boas práticas financeiras do SEBRAE ao sistema de
|     | recomendações |     |     | da ferramenta; |     |     |     |
| --- | ------------- | --- | --- | -------------- | --- | --- | --- |
- Validar a usabilidade do software por meio de ciclos de testes funcionais.
| 2 REVISÃO |        | DA         | LITERATURA |      |                     |     |             |
| --------- | ------ | ---------- | ---------- | ---- | ------------------- | --- | ----------- |
| 2.1       | Gestão | Financeira |            | para | Microempreendedores |     | Individuais |
A mortalidade prematura de Microempresas e Empresas de Pequeno Porte
(MEPs) no Brasil é um fenômeno multifatorial, mas a gestão financeira deficiente
aparece invariavelmente como causa primária nos levantamentos do SEBRAE. De
acordo com a pesquisa de Sobrevivência das Empresas (SEBRAE, 2016), aspectos
como falta de capital de giro, problemas financeiros e má gestão administrativa estão
entre os principais fatores de encerramento de atividades nos primeiros dois anos de
operação.

8
Gitman (2010) estabelece que a administração financeira não se resume ao
registro de entradas e saídas, mas exige a análise do Ciclo de Conversão de Caixa
e da Margem de Contribuição para garantir a solvência do negócio. O MEI, porém,
raramente possui formação na área: sua expertise está no ofício que exerce, seja
como artesão, prestador de serviços ou comerciante, e não na gestão de um negócio
formal.
AssafNeto(2021)complementaqueaestruturaeanálisedebalanços,embora
fundamental para a saúde financeira de qualquer empresa, exige um repertório
técnico que o microempreendedor, em geral, não domina. A lacuna entre o
conhecimento necessário e o disponível cria um ciclo vicioso: o MEI precifica
intuitivamente, desconhece seus custos ocultos como energia, depreciação,
embalagem, taxas de maquininha e antecipações, e só percebe o prejuízo no
fechamento do mês, quando já não há como corrigir as perdas da operação.
A cartilha do SEBRAE (2023) sobre fluxo de caixa reforça a importância do
controle financeiro contínuo e apresenta metodologias simplificadas para o
acompanhamentodeentradasesaídas.Talmaterialservedebaseparaaconstrução
das regras de negócio do Margem.AI, garantindo alinhamento com as melhores
práticas orientadas especificamente ao perfil do MEI brasileiro.
2.2 Sistemas de Apoio à Decisão
A fundamentação deste projeto também se baseia no conceito de Sistemas de
Apoio à Decisão (SAD). De acordo com Turban (2010), um SAD deve possuir um
subsistema de gerenciamento de dados e uma interface que permita ao usuário
interagir com modelos analíticos de forma intuitiva. O Margem.AI se enquadra nessa
categoria ao transformar dados brutos de vendas e custos em recomendações
acionáveis para o empreendedor.
O uso de planilhas eletrônicas, embora poderoso, apresenta barreiras de
usabilidade e integridade de dados para o usuário leigo. Erros de fórmula, ausência
de validação de entrada e a necessidade de atualização manual tornam esse modelo
inadequado para o perfil do MEI, que precisa de respostas rápidas no cotidiano do

9
negócio. O Margem.AI propõe a aplicação de Inteligência de Dados para transformar
o fluxo de caixa passivo em um consultor ativo, disponível no momento exato da
decisão.
2.3 Tecnologias e Arquitetura de Software
A construção do Margem.AI utiliza padrões de arquitetura moderna orientados
à manutenibilidade e escalabilidade. O conceito de Domain-Driven Design (DDD),
propostoporEvans(2011),orientaaseparaçãodasregrasdenegóciofinanceirasem
uma camada independente de frameworks, facilitando tanto os testes quanto a
evolução da solução ao longo do tempo.
A adoção do Test Driven Development (TDD), conforme Beck (2003), é
especialmente relevante para um sistema de cálculo financeiro, onde a precisão
matemáticaénãonegociável.Cadafórmula,comoMargemBruta,MarkupePontode
Equilíbrio, será coberta por testes unitários antes de sua implementação, garantindo
que o motor de cálculo produza resultados corretos e verificáveis.
Para o gerenciamento do processo de desenvolvimento, adota-se o framework
Scrum, conforme Schwaber e Sutherland (2020), com elementos de Kanban para
visualização do fluxo de trabalho. A combinação dessas metodologias ágeis viabiliza
entregas incrementais e permite a incorporação de feedback ao longo do ciclo de
desenvolvimento. O backend da aplicação é construído com Spring Boot, tecnologia
consolidada no ecossistema Java e documentada por Walls (2019), enquanto o
frontend utiliza tecnologias web modernas desenvolvidas com auxílio do VS Code.
3 SOLUÇÃO ADOTADA
O Margem.AI é concebido como uma aplicação Web/PWA (Progressive Web
Application), acessível por navegador em dispositivos móveis e desktops, sem
necessidade de instalação. A abordagem PWA é estratégica: garante disponibilidade
imediatanomomentodadecisão,sejanobalcãoounanegociaçãocomofornecedor,
sem as barreiras de acesso típicas de aplicativos nativos.

10
| 3.1 Metodologia | de  | Desenvolvimento |     |     |
| --------------- | --- | --------------- | --- | --- |
A metodologia adotada é Ágil (Scrum/Kanban), com foco em entrega contínua.
| O processo | é dividido | em quatro | fases principais: |     |
| ---------- | ---------- | --------- | ----------------- | --- |
Na Fase de Discovery, realiza-se o mapeamento das fórmulas financeiras
fundamentais (Margem Bruta, Markup e Ponto de Equilíbrio) e sua tradução para
requisitos de software por meio de User Stories. Esta fase é orientada pelo material
do SEBRAE e por literatura financeira aplicada ao contexto MEI.
No Ciclo de Desenvolvimento Orientado a Testes (TDD), para cada regra de
cálculo financeiro, desenvolve-se primeiramente um teste unitário para garantir a
precisão matemática, seguido pela implementação da lógica de negócio. Esta
abordagem assegura que o motor de cálculo seja confiável e auditável.
Na fase de Validação de Modelos, os resultados gerados pelo assistente são
comparados com casos de teste reais extraídos do portal de soluções do SEBRAE,
validando a aderência do sistema às práticas recomendadas para o perfil MEI.
Porfim,osCiclosdeTestesFuncionaiscontemplamavalidaçãodausabilidade
com usuários representativos do público-alvo, identificando e corrigindo
| inconsistências | antes      | da entrega | do protótipo | final. |
| --------------- | ---------- | ---------- | ------------ | ------ |
| 3.2 Modelo      | da Solução |            |              |        |
A arquitetura do Margem.AI é organizada em três camadas principais: a
camada de apresentação (frontend), responsável pela interface do usuário; a camada
de negócio (backend), onde residem as regras de cálculo financeiro; e a camada de
dados, responsável pela persistência das informações de vendas, custos e
| configurações | do MEI.         |            |            |      |
| ------------- | --------------- | ---------- | ---------- | ---- |
| As            | funcionalidades | principais | da solução | são: |
MotordeCálculodeMargens:componentecentraldosistema,responsávelpor
calcular automaticamente a Margem Bruta, o Markup e o Ponto de Equilíbrio com
base nos custos fixos e variáveis cadastrados pelo usuário. O motor considera todos

11
os custos invisíveis relevantes para o perfil MEI, como taxas de maquininha, impostos
| do Simples | Nacional | e depreciação | de equipamentos. |     |
| ---------- | -------- | ------------- | ---------------- | --- |
Dashboard de Fluxo de Caixa: painel simplificado que apresenta visualmente
a evolução financeira do negócio, com indicadores de receita, despesas e saldo
disponível. O objetivo é que o MEI consiga, com um único olhar, avaliar a saúde
| financeira | do negócio | no período | corrente. |     |
| ---------- | ---------- | ---------- | --------- | --- |
Sistema de Recomendações: módulo que analisa os dados inseridos pelo
usuário e gera alertas e sugestões baseados nas diretrizes do SEBRAE. Exemplos
dealertasincluemavisossobreaproximaçãodotetodefaturamentoMEI,identificação
de vendas no crédito parcelado que comprometem o capital de giro, e sugestões de
ajuste de preço quando a margem calculada estiver abaixo do mínimo sustentável.
Assistente de Precificação: interface conversacional que permite ao MEI
simular cenários antes da decisão, como calcular o preço mínimo de venda dado um
custo e uma margem desejada, ou verificar o impacto de um desconto sobre o lucro
| líquido | da operação. |     |                |       |
| ------- | ------------ | --- | -------------- | ----- |
| DIGRAMA | ENTIDADE     |     | RELACIONAMENTO | (DER) |

12
| DIAGRAMA | DE CLASSES |        |            |
| -------- | ---------- | ------ | ---------- |
| DIAGRAMA | DE CASO    | DE USO | - COMPLETO |

13
| DIAGRAMA | DE CASO | DE USO | - EXPANDIDO |
| -------- | ------- | ------ | ----------- |

14
| DIAGRAMA | DE SEQUÊNCIA | – UC02 |
| -------- | ------------ | ------ |
| DIAGRAMA | DE SEQUÊNCIA | – UC03 |

15
DIAGRAMA DE ATIVIDADE

16
3.3 Viabilidade de Execução
Osrecursosnecessáriosparaaexecuçãosãodenaturezalógicaetecnológica,
já disponíveis pelos autores: hardware próprio (estações de trabalho macOS), acesso
à internet e licenças gratuitas das ferramentas de desenvolvimento (IntelliJ IDEA, VS
Code). A pesquisa e o desenvolvimento serão realizados nos laboratórios do IFSP
Campus Salto e em ambiente de home office.
O apoio técnico será provido pelos orientadores do projeto. Não há custo
previsto para parcerias externas, uma vez que a base de conhecimento do SEBRAE
é de domínio público. A infraestrutura de nuvem para o ambiente de desenvolvimento
e testes será suportada por planos gratuitos de provedores como Railway ou Render,
garantindo a viabilidade econômica do projeto.
Em relação à sustentabilidade do modelo de negócio, a equipe avalia uma
arquitetura híbrida para versões futuras: o processamento de operações rotineiras
ocorreria localmente (no dispositivo do usuário), enquanto funcionalidades de
inteligência avançada poderiam ser executadas em nuvem, reduzindo os custos
operacionaisaumnívelcompatívelcomacapacidadedepagamentodopúblicoMEI.
4 PLANEJAMENTO DE ATIVIDADES
Oplanejamentodoprojetoestáorganizadoemoitometas,distribuídasaolongo
do ano de 2026, conforme apresentado na Tabela 1. As metas refletem o ciclo
completo de vida do software, desde a análise de requisitos até a entrega do relatório
final e a publicação científica.
Tabela 1 – Metas estabelecidas para o projeto
METAS DESCRIÇÃO
1.LevantamentodeRequisitos IdentificaçãodedoresdoMEIedefiniçãodoBacklogdoProduto
combasenoSEBRAE.
2.ArquiteturaeModelagem Definição da estrutura do banco de dados e arquitetura da
aplicação.
3.DesenvolvimentodoNúcleo Implementação das principais funcionalidades do sistema,
Funcional incluindo controle de fluxo de caixa e cálculo de margens de
lucro.
4.DesenvolvimentodeInsights Implementação de um sistema de recomendações baseado em
regrasfinanceiraseanálisedosdadosinseridospelousuário.
5.CiclodeTesteseAjustes Realização de testes unitários e funcionais, validação dos
resultadosobtidosecorreçãodeinconsistênciasidentificadas.
6.RelatórioCientíficoPI1 Elaboração e entrega da documentação técnica referente ao

17
|     | METAS |     |     |     | DESCRIÇÃO |     |     |
| --- | ----- | --- | --- | --- | --------- | --- | --- |
ProjetoIntegrador1.
7.PublicaçãodeArtigo Desenvolvimento de artigo científico abordando a proposta, a
|     |     |     | implementação | e os impactos | da solução | na gestão | financeira |
| --- | --- | --- | ------------- | ------------- | ---------- | --------- | ---------- |
deMEIs.
8.RelatórioFinalPI2 Elaboração do relatório final do projeto e apresentação do
protótipodesenvolvido.
Fonte:elaboradapelosautores.
Ocronogramapropostodistribuiasatividadesdeformaarespeitarasequência
natural de desenvolvimento de software: requisitos e arquitetura precedem o
desenvolvimento do núcleo funcional, que por sua vez antecede os testes e a
documentação final. A Tabela 2 apresenta o cronograma mensal com as metas
| previstas | para                     | cada período. |                |               |         |         |         |
| --------- | ------------------------ | ------------- | -------------- | ------------- | ------- | ------- | ------- |
|           |                          | Tabela        | 2 – Cronograma | de atividades |         |         |         |
| Nº        |                          | Meta          | MAR ABR        | MAI JUN       | JUL AGO | SET OUT | NOV DEZ |
| 1         | LevantamentodeRequisitos |               | X X            |               |         |         |         |
| 2         | ArquiteturaeModelagem    |               | X              | X             |         |         |         |
| 3         | DesenvolvimentodoNúcleo  |               |                | X X           |         |         |         |
Funcional
| 4   | DesenvolvimentodeInsights |     |     | X   | X   |     |     |
| --- | ------------------------- | --- | --- | --- | --- | --- | --- |
| 5   | CiclodeTesteseAjustes     |     |     |     | X X |     |     |
| 6   | RelatórioCientíficoPI1    |     |     |     | X   |     |     |
| 7   | PublicaçãodeArtigo        |     |     |     |     | X X |     |
| 8   | RelatórioFinalPI2         |     |     |     |     |     | X X |
Fonte:elaboradapelosautores.
As atividades de Levantamento de Requisitos e Arquitetura estão previstas
para os meses de março e abril, período de maior contato com a literatura de
referência e com os materiais do SEBRAE. O desenvolvimento do núcleo funcional e
dos módulos de insights ocorre entre abril e julho, com os testes sendo realizados de
julho a agosto. A documentação técnica PI1 está prevista para agosto, enquanto a
publicação do artigo científico e a entrega do relatório final PI2 concentram-se no
| segundo | semestre | do ano. |     |     |     |     |     |
| ------- | -------- | ------- | --- | --- | --- | --- | --- |
Eventuais alterações no cronograma serão documentadas e justificadas nos
relatórios parciais do projeto, em conformidade com a metodologia ágil adotada, que
prevê adaptação contínua ao contexto e às descobertas realizadas ao longo do
desenvolvimento.

18
REFERÊNCIAS
ASSAF NETO, Alexandre. Estrutura e Análise de Balanços: um enfoque econômico-
| financeiro. | 12. ed. São | Paulo: Atlas, | 2021. |
| ----------- | ----------- | ------------- | ----- |
BECK, Kent. Test Driven Development: by example. Boston: Addison-Wesley, 2003.
COHN, Mike. Desenvolvimento Ágil de Software com Scrum. Porto Alegre: Bookman, 2011.
EVANS, Eric. Domain-Driven Design: atacando a complexidade no coração do software. Rio
| de Janeiro: | Alta Books, | 2011. |     |
| ----------- | ----------- | ----- | --- |
GITMAN, Lawrence J. Princípios de Administração Financeira. 12. ed. São Paulo: Pearson,
2010.
MARTIN, Robert C. Código Limpo: habilidades práticas do Agile Software. Rio de Janeiro:
| Alta Books, | 2009. |     |     |
| ----------- | ----- | --- | --- |
SCHWABER, Ken; SUTHERLAND, Jeff. O Guia do Scrum. Scrum.org, 2020. Disponível em:
| https://scrumguides.org. |     | Acesso | em: 28 mar. 2026. |
| ------------------------ | --- | ------ | ----------------- |
SEBRAE. Como elaborar um fluxo de caixa. Brasília: SEBRAE, 2023. Disponível em:
| https://sebrae.com.br. |     | Acesso em: | 28 mar. 2026. |
| ---------------------- | --- | ---------- | ------------- |
SEBRAE. Sobrevivência das empresas no Brasil. Relatório de Pesquisa. Brasília: SEBRAE,
2016. Disponível em: https://sebrae.com.br. Acesso em: 28 mar. 2026.
TURBAN, Efraim. Decision Support and Business Intelligence Systems. 9. ed. Nova Jersey:
| Prentice | Hall, 2010. |     |     |
| -------- | ----------- | --- | --- |
WALLS, Craig. Spring em Ação. 5. ed. Rio de Janeiro: Alta Books, 2019.

19
| Assinaturas | dos integrantes          | do grupo: |                    |
| ----------- | ------------------------ | --------- | ------------------ |
| Prontuário  |                          | Nome      | Assinatura(Gov.br) |
| SL3051617   | MarioH.M.A.Pedrao        |           |                    |
| SL305070x   | ErickH.ToaliariFortunato |           |                    |
| SL3051901   | AdrianoCamocardiJunior   |           |                    |

20
|     | APÊNDICE | A – Detalhamento | das | Funcionalidades | do Margem.AI |
| --- | -------- | ---------------- | --- | --------------- | ------------ |
Este apêndice detalha as funcionalidades identificadas durante a fase de
Discovery do projeto, organizadas em ordem de prioridade para o desenvolvimento
| do MVP          | (Produto | Mínimo Viável). |                   |     |     |
| --------------- | -------- | --------------- | ----------------- | --- | --- |
| Funcionalidades |          | do MVP          | (Escopo PI1/PI2): |     |     |
CadastrodeCustosFixoseVariáveis:permiteaoMEIregistrartodososcustos
recorrentes do negócio (aluguel, energia, salários, taxas de maquininha, impostos) e
os custos variáveis por produto ou serviço. O sistema utiliza esses dados como base
| para todos | os cálculos | de margem. |     |     |     |
| ---------- | ----------- | ---------- | --- | --- | --- |
Calculadora de Preço de Venda: a partir do custo de um produto/serviço e da
margem de lucro desejada, o sistema calcula automaticamente o preço mínimo de
venda viável. A fórmula utiliza o conceito de Markup, conforme orientação do
SEBRAE.
Registro de Vendas: módulo simples para registro das vendas realizadas, com
identificação do produto/serviço, valor, forma de pagamento e data. O registro
alimenta o dashboard de fluxo de caixa e o motor de análise de margens.
Alerta de Teto MEI: o sistema monitora o faturamento acumulado e emite
alertas quando o MEI se aproxima do limite anual permitido pela legislação,
| prevenindo      | o desenquadramento |         | inadvertido            | da categoria. |     |
| --------------- | ------------------ | ------- | ---------------------- | ------------- | --- |
| Funcionalidades |                    | Futuras | (Backlog Prioritário): |               |     |
Pílulas de Educação Financeira: toda vez que o sistema identificar que o
usuário estava prestes a tomar uma decisão prejudicial à margem e a ferramenta o
preveniu, envia uma dica educativa explicando o conceito financeiro por trás do erro
evitado.
Alerta de Capital de Giro: o sistema identifica padrões de vendas no crédito
parcelado que podem comprometer a disponibilidade de caixa para reposição de
| estoque | e emite | alertas preventivos. |     |     |     |
| ------- | ------- | -------------------- | --- | --- | --- |
Simulador de Cenários: interface que permite ao MEI realizar perguntas
hipotéticas ao sistema, como calcular a meta de vendas necessária para cobrir um
novo custo fixo ou avaliar o impacto de uma política de desconto sobre o lucro do
período.
Personalização por Nicho: adaptar a interação e as sugestões de custos
invisíveis de acordo com o segmento do MEI, como o desperdício específico de uma

21
doceria versus o desgaste de ferramentas de um mecânico, tornando as
recomendações do sistema mais precisas e contextualizadas para cada tipo de
negócio.
Relatório de Lucro Recuperado: fechamento periódico mostrando quanto
dinheiro o MEI deixou de perder porque a precificação foi corrigida na hora certa com
o auxílio do sistema, reforçando o valor percebido da ferramenta e contribuindo para
a educação financeira progressiva do empreendedor.
Todas as funcionalidades do backlog foram identificadas durante a fase de
Discovery a partir da análise das dores relatadas pelo perfil-alvo do projeto. A
priorização seguiu a metodologia MoSCoW (Must have, Should have, Could have,
Would have), garantindo que o MVP concentre esforço nas funcionalidades de maior
impacto direto na tomada de decisão financeira do MEI. As demais funcionalidades
permanecem documentadas no backlog do produto e poderão ser incorporadas em
iterações futuras, conforme a disponibilidade de tempo e os resultados dos ciclos de
testes com usuários reais.

22
ANEXO A – Proposta de Trabalho Original
A Proposta de Trabalho original do projeto Margem.AI, submetida e aprovada
noiníciodosemestreletivode2026, encontra-searquivadanosistemaacadêmicodo
IFSP Campus Salto. O documento descreve o problema identificado, a solução
proposta,osobjetivos,ametodologia,oplanodetrabalhoeaviabilidadedeexecução
do projeto, conforme template institucional da disciplina Projeto Integrador 1.
A proposta foi assinada digitalmente pelos integrantes do grupo: Mario
Henrique Martins Alves Pedrao (SL3051617), Erick Henrique Toaliari Fortunato
(SL305070x) e Adriano Camocardi Junior (SL3051901), por meio da plataforma
Gov.br, conforme exigência do regulamento da disciplina.
O conteúdo integral da proposta serviu de base para a elaboração deste
Relatório Científico, e seus principais elementos (objetivos, metodologia, plano de
trabalho e referências) foram expandidos e detalhados ao longo dos capítulos
precedentes.
A integração entre proposta e relatório assegura a rastreabilidade do projeto:
cada meta definida na Proposta de Trabalho está refletida no Plano de Atividades
descrito no Capítulo 4, e cada objetivo específico listado encontra correspondência
nas funcionalidades detalhadas no Capítulo 3 e no Apêndice A deste documento.
A Proposta de Trabalho também registrou a análise inicial de viabilidade
econômicadoprojeto,incluindoareflexãosobreoscustosdeinfraestruturaemnuvem
e a estratégia híbrida proposta como alternativa sustentável para o modelo de
negócio. Essa análise orientou decisões de arquitetura tomadas durante a fase de
modelagemdosistema,garantindoqueoprodutofinalsejaviávelnãoapenastécnica,
mas também economicamente para o público MEI ao qual se destina.
