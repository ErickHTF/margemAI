export const ASSISTANT_NAME = 'Margô'

export const QUICK_ACTIONS = [
  { key: 'diagnosis', label: 'Analisar meu negócio', prompt: 'Faça um diagnóstico completo do meu negócio e diga o que devo melhorar primeiro.' },
  { key: 'projection', label: 'Ver os próximos 6 meses', prompt: 'Projete os próximos 6 meses do meu negócio e mostre também um cenário com preços 5% maiores.' }
]

export const DEFAULT_SUGGESTIONS = [
  'Quais produtos estão abaixo do preço mínimo?',
  'Quanto estou pagando de taxa de maquininha?',
  'Quanto preciso vender por mês para cobrir meus custos?',
  'Como está meu teto do MEI este ano?'
]

export const SCREEN_SUGGESTIONS = {
  products: ['Quais produtos dão mais lucro?', 'Algum produto está abaixo do preço mínimo?'],
  sales: ['Quanto estou pagando de taxa por forma de pagamento?', 'Vale a pena incentivar o Pix?'],
  cashflow: ['Por que algum mês fechou no negativo?', 'Como devem ficar os próximos meses?'],
  costs: ['Meus custos fixos estão pesando demais?', 'Quanto preciso vender para cobrir os custos?'],
  pricing: ['Esse preço está bom?', 'Um desconto de 10% ainda dá lucro?'],
  categories: ['Minhas margens alvo fazem sentido?', 'Quais produtos estão abaixo da margem alvo?'],
  'payment-methods': ['Minhas taxas estão acima do recomendado?', 'Quanto eu economizaria com mais vendas no Pix?'],
  accounts: ['Como está o resultado do meu negócio?', 'Quanto posso retirar sem apertar o caixa?'],
  profile: ['Como está meu teto do MEI este ano?', 'Como está meu negócio?']
}
