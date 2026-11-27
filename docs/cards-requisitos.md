# Cards propostos para o Project Margem.AI #2

Preparados em 12/10/2026 a partir da develop e da revisão dos requisitos. **Não publicados:** Git e gh não conseguiram acessar o GitHub. Os IDs definitivos, duplicidades, labels, campos e formato exato dos cards existentes precisam ser conferidos no quadro antes da criação; não foram inventados números US/TECH.

O padrão confirmado em AGENTS.md exige US/TECH/INFRA, critérios de aceite, branches a partir de develop, Conventional Commits em português e PRs para develop. Esta integração documental à main foi solicitada expressamente pelo usuário.

## Requisitos comuns de implementação

- Reutilizar a organização existente de controller/service/repository/model/dto e frontend services/hooks/utils/components.
- Valores financeiros em BigDecimal com HALF_UP no backend; taxas sempre da matriz configurada, sem percentuais fixos duplicados.
- Atualizar OpenAPI ao alterar contratos, preservar isolamento por usuário e testar arredondamento, duplicidade e estornos quando aplicáveis.
- Interface em português, PageHeader, TipButton, ConfirmDialog e proteção de alterações não salvas conforme AGENTS.md.
- Rodar backend, lint, Vitest e build antes de commit; relatar falhas e limitações reais.
- Conferir cards existentes antes de publicar, atribuir IDs livres e vincular dependências. Recursos futuros abaixo não são autorização para implementar todos nesta alteração documental.

## Proposta 1 — TECH — Preservar custos históricos e corrigir apuração do painel

**Critérios de aceite:**

- [ ] Guardar custo da operação ao registrar a venda.
- [ ] definir fallback para custo base manual e custo de venda avulsa.
- [ ] evitar duplicar custos vinculados.
- [ ] preservar custos fixos por competência.
- [ ] alterações posteriores não reescrevem resultados históricos.
- [ ] testar venda, cancelamento e edição.

## Proposta 2 — US — Controlar contas empresariais, aportes e retiradas

**Critérios de aceite:**

- [ ] Saldo inicial e movimentos por conta.
- [ ] aportes, retiradas e transferências.
- [ ] pró-labore sem duplicar custos.
- [ ] filtros por conta.
- [ ] titular só acessa os próprios dados.

## Proposta 3 — US — Gerenciar contas a receber e baixa de parcelas

**Critérios de aceite:**

- [ ] Gerar parcelas pelas taxas e prazos configurados.
- [ ] soma exata em centavos.
- [ ] baixa parcial, total e estorno.
- [ ] atraso por vencimento.
- [ ] distinguir venda realizada de recebimento efetivo.

## Proposta 4 — US — Gerenciar contas a pagar e pagamentos efetivos

**Critérios de aceite:**

- [ ] Despesas recorrentes e pontuais com vencimento.
- [ ] baixa parcial, total e estorno.
- [ ] geração idempotente.
- [ ] evitar duplicação de custos.
- [ ] separar despesa de desembolso.

## Proposta 5 — US — Projetar caixa e alertar falta de capital de giro

**Critérios de aceite:**

- [ ] Depende de contas e títulos a receber/pagar.
- [ ] saldo diário realizado e projetado.
- [ ] indicar primeiro déficit, data e valor.
- [ ] limiar configurável.
- [ ] explicar hipóteses e dados faltantes.

## Proposta 6 — US — Definir metas e acompanhar reserva financeira

**Critérios de aceite:**

- [ ] Meta em reais ou meses de custos.
- [ ] aportes e resgates.
- [ ] progresso e histórico.
- [ ] separar recursos reservados do saldo livre.
- [ ] transferências sem criar receita fictícia.

## Proposta 7 — US — Gerenciar dívidas e simular quitação

**Critérios de aceite:**

- [ ] Saldo, juros, tarifas, parcelas e vencimentos.
- [ ] custo total comparável.
- [ ] cenários de antecipação com hipóteses explícitas.
- [ ] integrar calendário sem duplicar pagamentos.

## Proposta 8 — US — Acompanhar agenda de obrigações MEI

**Critérios de aceite:**

- [ ] Competência, vencimento e status de DAS e DASN-SIMEI.
- [ ] lembretes configuráveis.
- [ ] links oficiais verificados na implementação.
- [ ] comprovação manual identificada.
- [ ] não afirmar regularidade por simples marcação.

## Proposta 9 — US — Controlar estoque, giro e reposição

**Critérios de aceite:**

- [ ] Entradas, saídas e ajustes.
- [ ] venda e cancelamento com efeitos idempotentes.
- [ ] mínimo configurável.
- [ ] custo imobilizado e giro.
- [ ] serviços sem movimento de estoque.

## Proposta 10 — US — Planejar compras e investimentos com impacto no caixa

**Critérios de aceite:**

- [ ] Custo, desembolso e retorno estimado.
- [ ] comparar cenários.
- [ ] integrar projeção de caixa.
- [ ] hipóteses explícitas.
- [ ] evitar tratar retorno estimado como garantido.

## Proposta 11 — TECH — Executar testes Vitest no CI

**Critérios de aceite:**

- [ ] Adicionar etapa de testes frontend após instalação e antes do build.
- [ ] falha bloqueia workflow.
- [ ] manter lint e backend.
- [ ] documentar comandos e verificar execução real no GitHub Actions.

## Proposta 12 — TECH — Revisar contrato OpenAPI contra controllers e DTOs

**Critérios de aceite:**

- [ ] Conferir requests, responses, validações, enums e autenticação.
- [ ] exemplos de login e vendas válidos.
- [ ] resolver divergências reais.
- [ ] validar referências internas e contrato com testes pertinentes.

## Proposta 13 — TECH — Publicar diagramas e revisar relatório acadêmico

**Critérios de aceite:**

- [ ] DER, classes e fluxos compatíveis com implementação.
- [ ] artefatos versionados e links válidos.
- [ ] corrigir conversão contra PDF original.
- [ ] conferir fontes bibliográficas específicas.
- [ ] distinguir proposta e entrega.

## Proposta 14 — TECH — Medir tempo de fechamento e validar meta de redução

**Critérios de aceite:**

- [ ] Definir baseline, tarefa e participantes.
- [ ] registrar método e resultados anonimizados.
- [ ] comparar antes/depois.
- [ ] publicar resultado observado sem afirmar 50% sem evidência.

## Proposta 15 — TECH — Definir e validar suporte a PWA

**Critérios de aceite:**

- [ ] Definir escopo de instalação e offline.
- [ ] validar manifest, service worker e atualização.
- [ ] dados financeiros offline exigem estratégia explícita de segurança/sincronização.
- [ ] manter documentação como aplicação web até validar.

## Proposta 16 — US — Implementar assistente conversacional de precificação

**Critérios de aceite:**

- [ ] Confirmar escopo e provedor antes de implementar.
- [ ] consumir motor determinístico como fonte dos valores.
- [ ] validar permissões e dados.
- [ ] tratar indisponibilidade.
- [ ] não produzir valores financeiros inventados.
- [ ] mostrar hipóteses.

## Proposta 17 — US — Personalizar orientações por segmento do MEI

**Critérios de aceite:**

- [ ] Regras versionadas por segmento.
- [ ] explicar sugestões de custos.
- [ ] permitir ajuste pelo usuário.
- [ ] não inventar custos obrigatórios.
- [ ] validar conteúdo e manter fallback genérico.

## Proposta 18 — US — Apresentar relatório de impacto da correção de preços

**Critérios de aceite:**

- [ ] Registrar cenário anterior e corrigido.
- [ ] metodologia auditável.
- [ ] distinguir ganho estimado de lucro realizado.
- [ ] evitar dupla contagem.
- [ ] não atribuir causalidade sem evidência.

## Proposta 19 — US — Exibir dica educativa após decisão de margem evitada

**Critérios de aceite:**

- [ ] Definir eventos de desconto ou preço prejudicial.
- [ ] apresentar conceito e cálculo correspondente.
- [ ] permitir dispensar.
- [ ] não repetir sem mudança de contexto.
- [ ] respeitar padrão TipButton e acessibilidade.

