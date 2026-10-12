import { describe, it, expect } from 'vitest'
import { getApiErrorMessage } from './apiError'

describe('getApiErrorMessage', () => {
  it('usa a mensagem enviada pelo backend quando existir', () => {
    const err = { response: { data: { message: 'Venda não encontrada.' } } }
    expect(getApiErrorMessage(err, 'Erro genérico.')).toBe('Venda não encontrada.')
  })

  it.each([
    ['erro de rede sem resposta', new Error('Network Error')],
    ['resposta sem mensagem', { response: { data: {} } }],
    ['mensagem vazia', { response: { data: { message: '' } } }],
    ['erro indefinido', undefined]
  ])('cai no texto em português em caso de %s', (_, err) => {
    expect(getApiErrorMessage(err, 'Erro genérico.')).toBe('Erro genérico.')
  })
})
