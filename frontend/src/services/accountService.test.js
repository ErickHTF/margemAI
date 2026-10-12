import { describe, it, expect, vi } from 'vitest'
import api from './api'
import { accountService } from './accountService'
vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
describe('Contas empresariais', () => {
  it('lista contas e filtra histórico pelo identificador', async () => {
    api.get.mockResolvedValue({ data: [] })
    expect(await accountService.list()).toEqual([])
    await accountService.history('conta-1')
    expect(api.get).toHaveBeenCalledWith('/accounts/movements', { params: { accountId: 'conta-1' } })
  })
  it('envia conta e movimento para os endpoints corretos', async () => {
    api.post.mockResolvedValue({ data: { id: '1' } })
    const account = { name: 'Banco', openingBalance: '0' }
    expect(await accountService.create(account)).toEqual({ id: '1' })
    expect(api.post).toHaveBeenCalledWith('/accounts', account)
    const movement = { type: 'TRANSFERENCIA', accountId: '1', destinationId: '2', amount: '10.50' }
    await accountService.movement(movement)
    expect(api.post).toHaveBeenCalledWith('/accounts/movements', movement)
  })
})
