import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PayableFormDialog } from './PayablesManager'

const baseline = {
  description: 'Aluguel do ponto',
  category: 'ALUGUEL',
  dueDate: '2026-10-10',
  totalAmount: '135090',
  competency: '2026-10',
  notes: ''
}

const render = (value) => renderToStaticMarkup(
  <PayableFormDialog formId="conta" editing value={value} baseline={baseline} onChange={() => {}} onSubmit={() => {}} onCancel={() => {}} />
)

const saveButton = (markup) => markup.match(/<button[^>]*type="submit"[^>]*>/)?.[0]

describe('Formulário de conta a pagar', () => {
  it('mantém "Salvar" desabilitado e sem aviso enquanto nada foi alterado', () => {
    const markup = render(baseline)
    expect(markup).not.toContain('não salva')
    expect(saveButton(markup)).toContain('disabled=""')
  })

  it.each([
    [{ ...baseline, totalAmount: '142000' }, '1 alteração não salva'],
    [{ ...baseline, dueDate: '2026-10-15', notes: 'Boleto novo' }, '2 alterações não salvas']
  ])('conta as alterações não salvas e libera "Salvar"', (value, message) => {
    const markup = render(value)
    expect(markup).toContain(message)
    expect(saveButton(markup)).not.toContain('disabled=""')
  })
})
