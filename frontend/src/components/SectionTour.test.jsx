import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Landmark } from 'lucide-react'
import SectionTour from './SectionTour'
import PageHeader from './PageHeader'

const render = section => renderToStaticMarkup(
  <SectionTour section={section}>
    <PageHeader Icon={Landmark} title="Tela" description="Descrição"><button>Ação da tela</button></PageHeader>
  </SectionTour>
)
afterEach(() => vi.unstubAllGlobals())

describe('Guias dos menus', () => {
  it.each(['profile', 'products', 'accounts', 'sales', 'cashflow', 'costs', 'pricing', 'categories', 'payment-methods'])('oferece guia no primeiro acesso a %s, preservando as ações da tela', section => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    const html = render(section)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Como usar')
    expect(html).toContain('Ação da tela')
    expect(html).toContain('Pular guia')
    expect(html).toContain('Próximo')
  })
  it('não reabre o guia visto e mantém o botão para repetir', () => {
    vi.stubGlobal('localStorage', { getItem: key => key === 'margemai.tour.sales.v1' ? 'seen' : null })
    const html = render('sales')
    expect(html).not.toContain('role="dialog"')
    expect(html).toContain('Como usar')
    expect(render('costs')).toContain('role="dialog"')
  })
  it('preserva a preferência do guia de contas anterior', () => {
    vi.stubGlobal('localStorage', { getItem: key => key === 'margemai.accounts-tour.v1' ? 'seen' : null })
    expect(render('accounts')).not.toContain('role="dialog"')
  })
  it('continua disponível quando o navegador bloqueia armazenamento', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Bloqueado') } })
    expect(render('profile')).toContain('role="dialog"')
  })
  it('não oferece ajuda vazia em uma seção sem guia', () => {
    const html = render('desconhecida')
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('Como usar')
    expect(html).toContain('Ação da tela')
  })
})
