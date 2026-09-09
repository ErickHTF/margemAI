export const FIXED_COST_CATEGORIES = [
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'DAS_MEI', label: 'DAS MEI' },
  { value: 'ENERGIA', label: 'Energia' },
  { value: 'AGUA', label: 'Água' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'SALARIOS', label: 'Salários' },
  { value: 'PRO_LABORE', label: 'Pró-labore' },
  { value: 'TAXA_MAQUININHA', label: 'Taxa de maquininha' },
  { value: 'IMPOSTOS', label: 'Impostos' },
  { value: 'SEGUROS', label: 'Seguros' },
  { value: 'CONTABILIDADE', label: 'Contabilidade' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'DEPRECIACAO', label: 'Depreciação' },
  { value: 'OUTRO', label: 'Outro' }
]

export const VARIABLE_COST_CATEGORIES = [
  { value: 'MATERIA_PRIMA', label: 'Matéria-prima' },
  { value: 'EMBALAGEM', label: 'Embalagem' },
  { value: 'FRETE', label: 'Frete' },
  { value: 'COMISSAO', label: 'Comissão' },
  { value: 'TAXA_PAGAMENTO', label: 'Taxa de pagamento' },
  { value: 'IMPOSTO_VENDA', label: 'Imposto sobre venda' },
  { value: 'DESPERDICIO', label: 'Desperdício' },
  { value: 'OUTRO', label: 'Outro' }
]

export const costCategoryLabel = (categories, value) => {
  const found = categories.find((category) => category.value === value)
  return found ? found.label : value
}
