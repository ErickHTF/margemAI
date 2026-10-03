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
  }
]

export const getPillById = (id) => SEBRAE_PILLS.find((pill) => pill.id === id)

export const getPillsByCategory = (category) =>
  SEBRAE_PILLS.filter((pill) => pill.category === category)

export default SEBRAE_PILLS
