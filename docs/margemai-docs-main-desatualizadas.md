# Documentação da main desatualizada em relação à develop

Comparação realizada em 11/10/2026 entre `main` (`47acb4e`) e `develop` (`24dc09346a58ffe82fb56ed2f55a52a1c9d04556`). As referências locais coincidem com as respectivas referências `origin` disponíveis. Não foi possível atualizar pelo GitHub devido a uma falha de DNS. Trata-se de revisão documental e de código, sem execução da aplicação.

A main consultada contém apenas `README.md`, `margem.md` e `openapi.yaml`. Ela ainda não contém a implementação existente na develop. Portanto, os pontos abaixo são defasagens em relação ao desenvolvimento atual, e não necessariamente inconsistências com uma versão publicada da main.

## 1. README.md

O arquivo contém somente `# margemAI`. Faltam as informações já documentadas no README da develop:

- Público-alvo, problema atendido e proposta do produto.
- Funcionalidades efetivamente implementadas e seus módulos.
- Stack: Java 21, Spring Boot, React, Vite e PostgreSQL.
- Pré-requisitos e instruções de execução local e com Docker Compose.
- Comandos de testes e validação.
- Estrutura de backend e frontend e localização do contrato de API.
- Autenticação e principais recursos da API.
- Fluxo de integração pela develop, documentação de deploy e contexto acadêmico.
- Esclarecimento de que a versão atual usa cálculos e recomendações determinísticas e não integra um modelo de IA/LLM.

## 2. openapi.yaml

O contrato da main está na raiz. Na develop, está em `backend/src/main/resources/openapi.yaml`. O diff revela os seguintes pontos desatualizados:

| Área | Defasagem na main | Referência na develop |
| --- | --- | --- |
| Login | Documenta `email` no corpo da requisição. | Usa `identifier`, aceitando e-mail ou CNPJ, com ou sem máscara. |
| Paginação de custos fixos | Parâmetro escrito como `sizeßß`. | Corrigido para `size`. |
| Custos fixos | Não esclarece a seleção por mês de custos recorrentes e pontuais. | Descreve a regra do filtro mensal. |
| Atualização de custos | Não explica a diferença entre substituição por PUT e alteração parcial por PATCH. | Documenta obrigatoriedade de campos, tratamento de opcionais e que valores nulos no PATCH são ignorados. |
| Exclusão de custo variável | Descreve remoção genericamente. | Explicita a desativação lógica, preservando o registro. |
| Padrões de preço/categorias | Não contém os endpoints nem os modelos correspondentes. | Inclui listagem, criação, consulta, edição, desativação, alteração de status e revalidação de preços em lote. |
| Produtos | Não descreve os novos vínculos e parâmetros herdados. | Inclui categoria, margem efetiva, tributos, percentual variável e indicação de herança. |
| Rateio de custos fixos | Não contém os recursos de configuração e consolidação. | Inclui `/settings/operational/fixed-costs-summary` e `/settings/operational/rateio-config`. |
| Taxas de pagamento | Não contém a matriz de taxas e prazos. | Inclui `/settings/financial/payment-methods`, percentuais, tarifa fixa, parcelas, prazo de liquidação e valores recomendados. |
| Registro de vendas | Quantidade inteira; produto obrigatório; modelo antigo de valor e data. | Quantidade fracionária, descrição, `unitPrice`, `soldAt`, parcelas e taxa avulsa; produto deixa de ser obrigatório no esquema. |
| Retorno de vendas | Não descreve os campos financeiros e temporais novos. | Inclui valor bruto, taxa, valor líquido, parcelas, descrição e data/hora. |
| Listagem de vendas | Retorna apenas `PaginatedSales`. | Retorna `SaleSummaryResponse`, com totais e vendas paginadas. |
| Precificação | Exige produto e não contempla toda a configuração atual. | Aceita cálculo por custo base, percentuais informados ou herdados, tributos e rateio automático; ajusta limites de percentuais. |
| Histórico financeiro | Não contém o endpoint nem os modelos mensais. | Inclui `/dashboard/monthly-flow`, período de 6 a 12 meses, receitas, despesas, custos, taxas, saldo e comparações entre meses. |

Os endpoints acima são relativos à base da API. O ponto de equilíbrio já consta no contrato da main; a novidade identificada nesta revisão é sua integração à tela da calculadora na develop, não a criação de um endpoint ausente na main.

## 3. margem.md — relatório acadêmico

O conteúdo é idêntico ao de `backend/margem.md` na develop: houve mudança de localização, sem atualização textual. Como proposta histórica ele pode ser preservado, mas precisa distinguir claramente o planejamento original do estado atual.

| Trecho/tema | O que precisa ser atualizado ou qualificado |
| --- | --- |
| Resumo e metodologia | O texto usa futuro para desenvolvimento, testes e funcionalidades já presentes no código. Incluir o estado atual e as entregas verificadas. |
| Arquitetura e tecnologias | Substituir a descrição genérica do frontend por React/Vite e detalhar a organização efetiva, persistência, autenticação e execução. |
| Assistente conversacional e inteligência | São descritos como parte da solução, mas a versão atual usa telas e regras determinísticas. Identificar conversa e integração de IA como propostas ainda não entregues. |
| Dashboard de fluxo de caixa | O texto associa o painel a “saldo disponível”. O código agrega vendas pela data da venda e custos calculados; não comprova recebimentos, pagamentos ou saldo bancário. Explicitar que é uma visão financeira simplificada. |
| Recomendações de capital de giro | O modelo da solução cita identificação de parcelamentos que comprometem o giro; o apêndice coloca o alerta no futuro. A implementação revisada tem dicas e prazos configuráveis, mas não um calendário completo de caixa nem o alerta automático descrito. Harmonizar o status. |
| Pílulas educativas | O apêndice as classifica como futuras. Já existem pílulas contextuais na interface; o disparo específico após uma decisão evitada não deve ser presumido como implementado. |
| Personalização por nicho | Há cadastro de segmento, mas isso não comprova todas as recomendações específicas por nicho descritas. Separar o cadastro entregue da personalização futura. |
| Custos invisíveis | O texto sugere consideração de todos os custos relevantes. Os cálculos dependem dos dados e parâmetros fornecidos; não há garantia de descoberta automática de todos os custos. |
| Redução de pelo menos 50% no tempo de fechamento | Está apresentada como resultado esperado. Manter como meta até haver medição com usuários, método e resultados. |
| PWA | É apresentada como formato da solução. A existência de uma aplicação web não comprova recursos de PWA; documentar apenas o que foi efetivamente validado, como instalação e funcionamento offline. |
| Diagramas | Há títulos de DER, classes, casos de uso, sequência e atividade, mas o Markdown não contém os diagramas. Inserir arquivos/imagens ou links para os artefatos. |
| Formatação e referências | A conversão contém palavras concatenadas e tabelas quebradas. Revisar a legibilidade e substituir links genéricos por referências específicas verificadas. |

## Prioridade sugerida

1. Atualizar o contrato de API, sobretudo login e vendas, pois exemplos antigos podem induzir integrações incorretas.
2. Completar o README para permitir entender e executar o projeto.
3. Atualizar o relatório com a distinção entre proposta, implementação e resultado medido.
4. Incluir na main a documentação técnica e operacional presente na develop, junto da integração correspondente do código.

Este documento registra o diagnóstico anterior à integração. Nesta atualização, o README, o contrato e os guias da develop acompanham o código; o relatório recebeu uma seção de estado atual. Diagramas, revisão das fontes bibliográficas e comprovação de resultados permanecem pendentes.
