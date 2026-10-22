const step = (target, title, text, benefit) => ({ target, title, text, benefit })
export const MENU_TOURS = {
  profile: [
    step('profile-details', 'Seu negócio, do seu jeito', 'Confira o segmento e os dados da empresa.'),
    step('profile-edit', 'Mudou alguma coisa?', 'Atualize seu cadastro por aqui.')
  ],
  products: [
    step('products-new', 'O que você vende?', 'Cadastre um produto ou serviço em “Novo Item”.'),
    step('products-list', 'O custo mudou? Revise o item', 'Mantenha custos e preços dos itens atualizados.', 'Se o custo sobe e o preço fica igual, sua margem diminui.'),
    step('products-search', 'Encontre sem perder tempo', 'Busque pelo nome ou filtre por tipo.')
  ],
  accounts: [
    step('accounts-new', 'Onde fica seu dinheiro?', 'Cadastre seu banco PJ ou caixa e informe o saldo inicial. Uma conta pode bastar.'),
    step('accounts-movement', 'Entrou ou saiu? Registre', 'Lance aportes, retiradas, pró-labore ou transferências.', 'Confira também as vendas e despesas: elas ainda não entram automaticamente nestas contas.'),
    step('accounts-filter', 'Olhe uma conta de cada vez', 'Escolha uma conta para conferir saldo e movimentos.', 'Conferir com o extrato ajuda a encontrar registros esquecidos.')
  ],
  reserves: [
    step('reserves-summary', 'Reserva separada do caixa livre', 'Veja quanto já está guardado na reserva e quanto continua livre nas contas empresariais.'),
    step('reserves-goal', 'Defina sua meta de segurança', 'Escolha um valor fixo em reais ou dimensione por meses dos seus custos fixos ativos.', 'O SEBRAE recomenda guardar de 3 a 6 meses de custos fixos para imprevistos.'),
    step('reserves-movement', 'Registre aportes e resgates', 'Guarde parte da sobra mensal ou resgate em emergências sem gerar receita fictícia no faturamento.')
  ],
  sales: [
    step('sales-form', 'Vendeu? Registre aqui', 'Confira item, preço e pagamento neste formulário.', 'Vendas esquecidas deixam seu faturamento incompleto.'),
    step('sales-metrics', 'Veja o que sobra', 'O valor líquido desconta as taxas do faturamento.', 'Compare as formas de pagamento para entender o peso das taxas.'),
    step('sales-filters', 'Confira seu histórico', 'Filtre por pagamento e revise os lançamentos.')
  ],
  cashflow: [
    step('flow-period', 'Dê um passo para trás', 'Escolha quantos meses quer comparar.'),
    step('flow-summary', 'Receitas e despesas lado a lado', 'Compare receitas, despesas e resultado. Este painel não é seu saldo bancário.'),
    step('flow-chart', 'Encontre o ritmo do negócio', 'Compare os meses no gráfico.', 'Use os meses mais fracos como referência ao planejar despesas.')
  ],
  costs: [
    step('costs-tabs', 'Cada custo no seu lugar', 'Separe despesas fixas de custos variáveis.'),
    step('costs-content', 'Mudou o valor? Atualize', 'Revise aluguel, insumos e pró-labore regularmente.', 'Uma despesa esquecida pode fazer o preço parecer lucrativo sem ser.')
  ],
  pricing: [
    step('pricing-product', 'Comece pelo custo certo', 'Selecione um item ou preencha os dados da simulação.'),
    step('pricing-parameters', 'Proteja sua margem', 'Revise margem, despesas e taxa de pagamento, sem contar a taxa duas vezes.'),
    step('pricing-results', 'Compare antes de decidir', 'Confira o preço sugerido e o impacto dos descontos.', 'Um desconto pode consumir mais margem do que parece.')
  ],
  obligations: [
    step('obligations-summary', 'Acompanhe o calendário do ano', 'Escolha o ano e veja quantas obrigações estão pendentes, próximas do vencimento ou com comprovante anotado.'),
    step('obligations-reminders', 'Antecipe seus lembretes', 'Configure com quantos dias de antecedência quer destacar vencimentos próximos.'),
    step('obligations-links', 'Use apenas os portais oficiais', 'Emita a guia DAS no PGMEI e envie a declaração anual no DASN-SIMEI da Receita Federal.'),
    step('obligations-list', 'Anote seus comprovantes', 'Registre o número do recibo para seu controle interno.', 'A anotação aqui é declaratória e não substitui a consulta de regularidade na Receita Federal.')
  ],
  categories: [
    step('categories-new', 'Uma regra, vários itens', 'Crie um padrão de preço para seus produtos ou serviços.'),
    step('categories-list', 'Revise suas regras de preço', 'Confira margens, despesas e itens vinculados.', 'Uma mudança neste padrão pode afetar vários itens do catálogo.'),
    step('categories-search', 'Ache o padrão certo', 'Use a busca para localizar o que precisa ajustar.')
  ],
  'payment-methods': [
    step('fees-tabs', 'Confira sua operadora', 'Escolha a forma de pagamento que quer revisar.'),
    step('fees-table', 'A taxa mudou? Ajuste aqui', 'Confira percentual, tarifa fixa e prazo de recebimento.', 'Confira com a operadora: a tarifa fixa pesa mais nas vendas de menor valor.'),
    step('fees-save', 'Faça a mudança valer', 'Salve as alterações para usá-las nos próximos cálculos.')
  ]
}

export const PROFILE_EDIT_TOUR = [
  step('profile-form', 'Atualize os dados do negócio', 'Revise nome, segmento e teto de faturamento.'),
  step('profile-save', 'Confira antes de salvar', 'Salve suas mudanças ou volte para o perfil. Alterações pendentes ficam protegidas.')
]
