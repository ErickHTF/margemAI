export const SEBRAE_PILLS = [
  {
    id: 'markup-divisor',
    category: 'pricing',
    categoryLabel: 'Formação de Preço',
    title: 'Por que o Markup Divisor é mais seguro?',
    summary: 'No método SEBRAE, a margem de lucro e os custos incidem sobre o Preço de Venda Final (100%), e não apenas sobre o custo de compra.',
    content: 'Se você compra por R$ 50,00 e aplica 50% de margem simples (R$ 75,00), sua margem real na venda é de apenas 33,3%. Com a fórmula do Markup Divisor [Preço = Custo / (1 - %)], você garante que todos os tributos, comissões e sua margem líquida sejam integralmente cobertos.',
    tip: 'Lembre-se: A soma dos percentuais de custos fixos, variáveis, impostos e lucro desejado deve ser sempre estritamente inferior a 100%.'
  },
  {
    id: 'discount-danger',
    category: 'discount',
    categoryLabel: 'Simulação de Desconto',
    title: 'Desconto sem cálculo pode zerar seu lucro líquido',
    summary: 'Conceder 10% de desconto sobre o preço final impacta desproporcionalmente sua margem de lucro.',
    content: 'Se sua margem de lucro líquida é de 20%, um desconto de 10% no balcão consome exatamente 50% de todo o seu lucro! Ao conceder descontos, calcule previamente sua margem de contribuição mínima para não pagar para trabalhar.',
    tip: 'Prefira oferecer bônus, serviços agregados ou brindes de baixo custo unitário em vez de reduzir o preço nominal do produto.'
  },
  {
    id: 'margin-avoided',
    category: 'discount',
    categoryLabel: 'Preservação de Margem',
    title: 'Decisão de Margem Evitada: Proteja seu Lucro',
    summary: 'Ajustar o desconto a tempo evita operar no prejuízo e preserva a margem de contribuição do negócio.',
    content: 'Cada ponto percentual de desconto concedido é retirado diretamente do lucro líquido da empresa. Ao recuar de um desconto prejudicial, você garante que o preço praticado cubra integralmente os custos e gere margem real para manter o negócio saudável.',
    tip: 'Lembre-se: Vender abaixo do custo é pagar para trabalhar. Prefira agregar valor com pequenos diferenciais ou melhores condições em vez de reduzir o preço nominal.'
  },
  {
    id: 'pro-labore',
    category: 'costs',
    categoryLabel: 'Custos Fixos',
    title: 'Pró-labore não é lucro: separe suas contas!',
    summary: 'O salário do MEI deve fazer parte dos Custos Fixos mensais da empresa, e não ser retirado aleatoriamente das vendas.',
    content: 'Defina um valor fixo mensal de pró-labore para suas despesas pessoais e registre-o nos Custos Fixos do MargemAI. O lucro líquido da empresa pertence ao caixa do negócio para reinvestimento e capital de giro.',
    tip: 'Nunca misture a conta bancária de pessoa física com a conta PJ do MEI.'
  },
  {
    id: 'card-fees',
    category: 'sales',
    categoryLabel: 'Meios de Pagamento',
    title: 'Taxa de maquininha corrói seu lucro invisivelmente',
    summary: 'Receber no cartão de crédito parcelado sem repassar ou prever o custo da operadora pode zerar sua margem real.',
    content: 'Uma taxa de 4,5% + 1% por parcela em 6x representa quase 10% do valor da venda entregue à maquininha. Se a sua margem de lucro era de 15%, mais de 60% do seu lucro foi consumido pela intermediação financeira.',
    tip: 'Estimule pagamentos via Pix ou precifique antecipadamente prevendo a despesa média com meios de pagamento.'
  },
  {
    id: 'working-capital',
    category: 'working_capital',
    categoryLabel: 'Capital de Giro',
    title: 'O ciclo financeiro e a necessidade de capital de giro',
    summary: 'Vender a prazo e comprar à vista cria um buraco no caixa que pode levar o MEI ao endividamento.',
    content: 'Se você paga seu fornecedor em 15 dias, mas recebe de seus clientes em 30 ou 60 dias, precisará de capital de giro próprio para financiar essa diferença de tempo.',
    tip: 'Tente sempre negociar prazos com fornecedores maiores ou iguais aos prazos que concede a seus clientes.'
  },
  {
    id: 'financial-reserve',
    category: 'reserves',
    categoryLabel: 'Reserva Financeira',
    title: 'Quanto guardar na reserva de emergência do MEI?',
    summary: 'O SEBRAE recomenda manter de 3 a 6 meses dos seus custos fixos guardados para atravessar imprevistos e meses fracos sem recorrer a empréstimos caros.',
    content: 'Separar o saldo reservado do dinheiro livre das contas empresariais evita que o colchão de segurança seja consumido nas despesas do dia a dia. Além disso, aportes e resgates na reserva são transferências internas do patrimônio e não devem ser confundidos com faturamento de vendas.',
    tip: 'Comece com uma meta de 3 meses dos seus custos fixos mensais e faça aportes regulares sempre que fechar o mês no azul.'
  },
  {
    id: 'receivables-control',
    category: 'working_capital',
    categoryLabel: 'Contas a Receber',
    title: 'A diferença crucial entre Venda Realizada e Dinheiro no Caixa',
    summary: 'Vender no crédito parcelado gera faturamento contábil imediato, mas o dinheiro real entra aos poucos segundo o prazo da operadora.',
    content: 'Acompanhar as datas de liquidação e dar baixa nas parcelas recebidas evita que o MEI conte com um dinheiro que ainda não caiu na conta bancária. Além disso, monitorar parcelas atrasadas permite agir rápido para renegociar ou cobrar o cliente.',
    tip: 'Compare o valor líquido das parcelas com seu extrato bancário para garantir que nenhuma taxa indevida foi descontada pela maquininha.'
  },
  {
    id: 'mei-obligations',
    category: 'obligations',
    categoryLabel: 'Obrigações Fiscais MEI',
    title: 'DAS mensal e DASN-SIMEI anual: como manter o CNPJ protegido',
    summary: 'O pagamento do DAS vence todo dia 20 e a declaração anual DASN-SIMEI deve ser entregue até 31 de maio nos portais oficiais da Receita Federal.',
    content: 'Mesmo sem faturamento no mês, o MEI precisa emitir e pagar o DAS no PGMEI e entregar a DASN-SIMEI anual. Guardar o código do comprovante no sistema ajuda na sua organização interna, mas a situação fiscal oficial deve ser sempre conferida diretamente no PGMEI ou e-CAC.',
    tip: 'Inclua o valor fixo do DAS nos seus Custos Fixos mensais e consulte periodicamente o extrato oficial no PGMEI.'
  },
  {
    id: 'payables-management',
    category: 'payables',
    categoryLabel: 'Contas a Pagar',
    title: 'Despesa vs. Desembolso: controle a competência e o caixa',
    summary: 'Registrar a conta quando ela chega (competência) evita surpresas no dia em que o dinheiro sai do caixa (desembolso).',
    content: 'No regime de competência, a despesa pertence ao mês do consumo (energia, aluguel, DAS-MEI). No regime de caixa, o desembolso ocorre na data do pagamento efetivo. Acompanhar contas a pagar com antecedência protege o MEI contra juros e multas por atraso.',
    tip: 'Gere os títulos recorrentes no início de cada mês e registre baixas parciais ou totais assim que efetuar o pagamento.'
  }
]

export const getPillById = (id) => SEBRAE_PILLS.find((pill) => pill.id === id)

export const getPillsByCategory = (category) =>
  SEBRAE_PILLS.filter((pill) => pill.category === category)

/**
 * Seleciona a pílula educativa do SEBRAE mais adequada para o contexto atual do usuário.
 *
 * @param {Object} context
 * @param {string} [context.action] - Ação atual: 'discount' | 'payment' | 'working_capital' | 'fixed_costs' | 'pricing' | 'margin_avoided' | 'receivables' | 'payables'
 * @param {boolean} [context.discountActive] - Se está simulando desconto
 * @param {string} [context.paymentMethod] - Forma de pagamento (ex: 'CREDIT_CARD', 'INSTALLMENTS', 'CARD')
 * @param {boolean} [context.isTermSale] - Se é venda a prazo
 * @param {number|string} [context.fixedCostPercent] - Percentual de custos fixos
 * @param {number|string} [context.variableCostPercent] - Percentual de custos variáveis
 * @returns {Object} Pílula educativa recomendada
 */
export function selectContextualPill({
  action,
  discountActive = false,
  paymentMethod = null,
  isTermSale = false,
  fixedCostPercent = 0,
  variableCostPercent = 0
} = {}) {
  // 0. Decisão de margem evitada
  if (action === 'margin_avoided') {
    return getPillById('margin-avoided') || getPillById('discount-danger')
  }

  // 1. Contas a pagar e gestão de despesas
  if (action === 'payables') {
    return getPillById('payables-management')
  }

  // 2. Simulação ou concessão de desconto
  if (action === 'discount' || discountActive) {
    return getPillById('discount-danger')
  }

  // 3. Meios de pagamento e taxas de maquininha/cartão
  if (
    action === 'payment' ||
    paymentMethod === 'CREDIT_CARD' ||
    paymentMethod === 'INSTALLMENTS' ||
    paymentMethod === 'CARD' ||
    Number(variableCostPercent) >= 15
  ) {
    return getPillById('card-fees')
  }

  // 4. Contas a receber
  if (action === 'receivables') {
    return getPillById('receivables-control')
  }

  // 5. Vendas a prazo ou impacto no capital de giro
  if (action === 'working_capital' || isTermSale) {
    return getPillById('working-capital')
  }

  // 6. Custos fixos elevados / pró-labore
  if (action === 'fixed_costs' || Number(fixedCostPercent) >= 25) {
    return getPillById('pro-labore')
  }

  // 7. Formação de preço padrão (Markup Divisor SEBRAE)
  return getPillById('markup-divisor')
}

export default SEBRAE_PILLS
