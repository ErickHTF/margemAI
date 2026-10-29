import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MarginAvoidedNotice from './MarginAvoidedNotice'
import { Card } from './ui'

const sampleAvoidedData = {
  triggered: true,
  contextKey: 'product:prod-123:tier:1-5',
  avoidedLossPerUnit: 18.5,
  marginRecoveredPoints: 22.4,
  concept: {
    title: 'Decisão Consciente: Margem Protegida',
    summary: 'Você ajustou o desconto a tempo e protegeu seu lucro unitário.',
    explanation: 'Explicação detalhada sobre a preservação de margem de contribuição.',
    tip: 'Prefira alternativas a descontos desregulados.'
  },
  pill: {
    id: 'margin-avoided',
    category: 'discount',
    title: 'Decisão de Margem Evitada',
    summary: 'Resumo SEBRAE'
  }
}

function findNodeByProp(node, prop, value) {
  if (!node || typeof node !== 'object') return null
  if (node.props && node.props[prop] === value) return node
  if (node.props?.children) {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
    for (const child of children) {
      const found = findNodeByProp(child, prop, value)
      if (found) return found
    }
  }
  return null
}

function findNodesByType(node, type, found = []) {
  if (!node || typeof node !== 'object') return found
  if (node.type === type) found.push(node)
  const children = node.props?.children
  if (children) {
    for (const child of Array.isArray(children) ? children : [children]) findNodesByType(child, type, found)
  }
  return found
}

describe('MarginAvoidedNotice', () => {
  it('não renderiza nada quando avoidedData for nulo ou indefinido', () => {
    expect(renderToStaticMarkup(<MarginAvoidedNotice avoidedData={null} onDismiss={() => {}} />)).toBe('')
    expect(renderToStaticMarkup(<MarginAvoidedNotice avoidedData={undefined} onDismiss={() => {}} />)).toBe('')
  })

  it('renderiza com atributos de acessibilidade role="status" e aria-live="polite"', () => {
    const html = renderToStaticMarkup(
      <MarginAvoidedNotice avoidedData={sampleAvoidedData} onDismiss={() => {}} />
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('Decisão Consciente: Margem Protegida')
    expect(html).toContain('Margem protegida')
  })

  it('exibe com precisão os valores de prejuízo evitado e margem recuperada formatados', () => {
    const html = renderToStaticMarkup(
      <MarginAvoidedNotice avoidedData={sampleAvoidedData} onDismiss={() => {}} />
    )

    expect(html).toContain('Prejuízo evitado por unidade:')
    expect(html).toMatch(/18,50/)
    expect(html).toContain('Margem recuperada:')
    expect(html).toContain('+22,4 p.p.')
  })

  it('renderiza o botão de dispensa acessível com aria-label', () => {
    const html = renderToStaticMarkup(
      <MarginAvoidedNotice avoidedData={sampleAvoidedData} onDismiss={() => {}} />
    )

    expect(html).toContain('aria-label="Dispensar dica educativa de margem evitada"')
    expect(html).toContain('Entendi / Dispensar')
  })

  it('aciona o callback onDismiss ao clicar no botão de dispensa', () => {
    const onDismiss = vi.fn()
    const tree = MarginAvoidedNotice({
      avoidedData: sampleAvoidedData,
      onDismiss
    })

    const dismissButton = findNodeByProp(
      tree,
      'aria-label',
      'Dispensar dica educativa de margem evitada'
    )
    expect(dismissButton).not.toBeNull()
    expect(dismissButton.props.onClick).toBeDefined()

    dismissButton.props.onClick()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('não embute TipButton: a pílula SEBRAE fica só no PageHeader', () => {
    const html = renderToStaticMarkup(
      <MarginAvoidedNotice avoidedData={sampleAvoidedData} onDismiss={() => {}} />
    )

    expect(html).not.toContain('aria-label="Dica:')
    expect(html).toContain('Saiba mais na dica SEBRAE no topo da tela.')
  })

  it('usa Card do kit para os resumos financeiros', () => {
    const tree = MarginAvoidedNotice({ avoidedData: sampleAvoidedData, onDismiss: () => {} })
    const cards = findNodesByType(tree, Card)

    expect(cards).toHaveLength(2)
    cards.forEach((card) => expect(card.props.className).toBeUndefined())
  })
})
