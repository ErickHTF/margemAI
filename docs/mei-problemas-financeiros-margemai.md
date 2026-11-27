# 10 problemas financeiros comuns de MEIs e o que o MargemAI resolve

Esta lista reúne problemas comuns, sem representar um ranking estatístico dos dez mais frequentes.

A avaliação foi revisada contra o código da branch `develop`, commit `24dc09346a58ffe82fb56ed2f55a52a1c9d04556`, em 11/10/2026. A branch local coincide com a referência `origin/develop` disponível. A tentativa de atualização remota falhou por resolução de DNS; não foi possível confirmar se há commits posteriores no GitHub. A análise foi feita por leitura do código, sem executar a aplicação. Recursos apresentados como futuros na documentação foram confrontados com a implementação antes de serem classificados.

**Critério:** “Sim” significa que há uma funcionalidade que atende diretamente ao problema, desde que os dados sejam cadastrados corretamente. “Não” significa que o sistema não resolve o problema completo hoje, embora possa ajudar na organização ou na prevenção. Nenhuma dessas respostas garante o resultado financeiro do negócio.

| Nº | Motivo | Por que causa problemas financeiros | O MargemAI resolve? | Por quê e qual é o limite |
| --- | --- | --- | --- | --- |
| 1 | Misturar dinheiro pessoal com o do negócio | Retiradas e despesas pessoais escondem o resultado da empresa e consomem o dinheiro necessário à operação. | **Não** | Há orientação educativa para separar as contas e registrar o pró-labore como custo fixo. Isso ajuda, mas não foi identificado um controle dedicado de contas pessoais, empresariais e retiradas. A separação depende da prática do empreendedor. |
| 2 | Não registrar entradas e saídas | Sem registros, gastos se acumulam e o empreendedor perde a visão de quanto sobra. | **Sim** | O registro de vendas, o cadastro de custos fixos e variáveis e o painel mensal permitem organizar as receitas e os custos informados. Depende de alimentação consistente; não equivale a uma conciliação bancária nem ao registro automático de toda movimentação de dinheiro. |
| 3 | Cobrar um preço que não cobre todos os custos | Esquecer materiais, despesas, taxas e remuneração do trabalho pode transformar vendas em prejuízo. | **Sim** | A calculadora de markup, a simulação de descontos, o ponto de equilíbrio mensal, os custos cadastrados e as taxas de pagamento configuráveis apoiam a formação do preço com margem desejada. Custos omitidos ou parâmetros incorretos prejudicam a estimativa; o preço calculado também precisa ser viável comercialmente. |
| 4 | Confundir faturamento com lucro | Tratar todo o valor vendido como dinheiro disponível pode deixar despesas sem cobertura. | **Sim** | O painel distingue receita, custos fixos, custos variáveis, taxas e saldo calculado, com cartões que detalham a composição das despesas, ajudando a enxergar o resultado dos dados registrados. O painel não inclui o custo base manual sem custos variáveis vinculados nem o custo de vendas avulsas, e edições de custos podem alterar o histórico. Esse saldo não é necessariamente o lucro contábil nem o dinheiro disponível no banco: o código agrega vendas pela data da venda, sem comprovar seu recebimento. |
| 5 | Ficar sem capital de giro | As contas vencem antes de o dinheiro das vendas chegar, comprometendo a continuidade da operação. | **Não** | O histórico financeiro e as dicas sobre vendas a prazo ajudam a perceber o risco. Porém, há configuração de prazo de liquidação por forma de pagamento, mas não foi identificado um calendário completo de recebimentos e pagamentos que calcule o déficit futuro de caixa. O alerta de capital de giro aparece como funcionalidade futura na documentação. |
| 6 | Não ter reserva para imprevistos | Quebra de equipamentos, queda nas vendas ou afastamento podem deixar o negócio sem dinheiro para despesas essenciais. | **Não** | A visão dos custos ajuda a dimensionar despesas, mas não foi identificado um módulo para definir metas de reserva, registrar aportes e acompanhar o valor efetivamente reservado. A ferramenta também não cria a reserva por conta própria. |
| 7 | Vender a prazo sem controlar os recebimentos | Atrasos e calotes provocam falta de caixa, mesmo quando o volume de vendas parece bom. | **Não** | Registrar forma de pagamento e parcelamento ajuda a calcular taxas, mas não substitui contas a receber. Não foi identificado controle completo de vencimentos, baixa de parcelas recebidas, inadimplência e cobrança. |
| 8 | Recorrer a crédito caro para cobrir déficits frequentes | Juros e novas parcelas aumentam as despesas e podem perpetuar a falta de dinheiro. | **Não** | A precificação e a análise de custos podem ajudar a prevenir déficits. Entretanto, não foi identificado um módulo de gestão de dívidas, comparação do custo de empréstimos ou planejamento de renegociação e quitação. |
| 9 | Deixar impostos e obrigações para depois | A desorganização com pagamentos e prazos pode gerar pendências e custos adicionais. | **Não** | O acompanhamento do teto de faturamento MEI atende a uma parte da gestão fiscal. Ele não substitui a emissão e o acompanhamento do DAS, a entrega da DASN-SIMEI ou a verificação de pendências. Registrar um imposto como custo também não comprova seu pagamento. |
| 10 | Comprar estoque ou investir sem planejamento | Produtos sem saída e investimentos acima da capacidade do negócio prendem recursos necessários às despesas do dia a dia. | **Não** | O catálogo e os custos ajudam a avaliar preços, mas não foi identificado controle completo de estoque, giro, reposição ou análise do retorno de investimentos. Cadastrar um produto não significa controlar suas quantidades e o dinheiro imobilizado nele. |

## Leitura do resultado

Pelo critério acima, o MargemAI atende diretamente a **3 dos 10 problemas**: falta de registro de vendas e custos, erros de precificação e confusão entre faturamento e resultado estimado. Esse número descreve a cobertura desta lista; não é uma medida de eficácia do produto.

Nos outros sete, há oportunidades de apoio educativo e prevenção, mas faltam recursos específicos para afirmar que o problema é resolvido. A proposta mais bem sustentada pelo código atual é: **ajudar o MEI a organizar vendas e custos, formar preços e entender suas margens para tomar decisões financeiras melhores.**

## Resultado da revisão contra a develop

As dez classificações foram mantidas: **3 “sim” e 7 “não”**. Em relação à cópia analisada inicialmente (`feature/improve-ui`, commit `a1e5803`), a develop acrescenta a seção de ponto de equilíbrio na calculadora, os cartões de composição das despesas, o indicador de teto MEI no fluxo de caixa e melhorias na restauração de taxas e na reavaliação de preços. Esses recursos reforçam a cobertura descrita, mas não entregam os módulos ausentes que justificam as sete respostas “não”.

Os links locais abaixo apontam para a cópia de trabalho, que estava em `develop` durante a revisão; o commit acima identifica a versão efetivamente avaliada.

## Base da avaliação

- [Documentação do projeto e escopo do MVP](../backend/margem.md): proposta, recursos previstos e funcionalidades futuras.
- [Guia do projeto](../AGENTS.md): módulos existentes, custos e regras de taxas de pagamento.
- [Cálculo do painel mensal](../backend/src/main/java/com/example/margemAI/service/DashboardService.java): agregação de receitas pela data da venda, custos e saldo estimado.
- [Cálculo explicativo de precificação](../frontend/src/utils/sebraeMethod.js): markup, percentuais e decomposição do preço.
- [Dicas educativas](../frontend/src/data/sebraePills.js): separação das contas, pró-labore, taxas e capital de giro.
- [Serviço de alertas](../backend/src/main/java/com/example/margemAI/service/AlertService.java): acompanhamento do limite de faturamento MEI.
