import { describe, it, expect } from 'vitest'
import { toApiHistory, parseInline, parseReply } from './assistantChat'

describe('toApiHistory', () => {
  it('envia só perguntas e respostas, sem avisos de erro nem campos da tela', () => {
    const history = toApiHistory([
      { id: 1, role: 'user', content: 'Qual meu teto?' },
      { id: 2, role: 'assistant', content: 'Você usou 37%.', toolsUsed: ['Teto de faturamento MEI'] },
      { id: 3, role: 'assistant', content: 'Assistente indisponível.', error: true },
      { id: 4, role: 'user', content: 'E no ano passado?' }
    ])

    expect(history).toEqual([
      { role: 'user', content: 'Qual meu teto?' },
      { role: 'assistant', content: 'Você usou 37%.' },
      { role: 'user', content: 'E no ano passado?' }
    ])
  })
})

describe('parseInline', () => {
  it('separa trechos em negrito do texto normal', () => {
    expect(parseInline('Preço mínimo **R$ 41,37** por unidade')).toEqual([
      { text: 'Preço mínimo ', bold: false },
      { text: 'R$ 41,37', bold: true },
      { text: ' por unidade', bold: false }
    ])
  })
})

describe('parseReply', () => {
  it.each([
    ['lista com hífen', '- Pix: 58%\n- Crédito: 42%', { type: 'list', ordered: false, count: 2 }],
    ['lista numerada', '1. Revise o preço\n2. Negocie a taxa\n3. Corte custos', { type: 'list', ordered: true, count: 3 }],
    ['parágrafo de várias linhas', 'Seu caixa cresceu.\nJulho foi o melhor mês.', { type: 'paragraph', count: 2 }]
  ])('reconhece %s', (_, text, expected) => {
    const [block] = parseReply(text)
    expect(block.type).toBe(expected.type)
    if (expected.type === 'list') {
      expect(block.ordered).toBe(expected.ordered)
      expect(block.items).toHaveLength(expected.count)
    } else {
      expect(block.lines).toHaveLength(expected.count)
    }
  })

  it('divide o texto em blocos por linha em branco e transforma títulos markdown em título', () => {
    const blocks = parseReply('### Diagnóstico\n\nMargem do Açaí 500ml: **18%**.\n\n- Aumente o preço')

    expect(blocks.map((block) => block.type)).toEqual(['heading', 'paragraph', 'list'])
    expect(blocks[0].segments).toEqual([{ text: 'Diagnóstico', bold: false }])
    expect(blocks[1].lines[0][1]).toEqual({ text: '18%', bold: true })
  })
})
