import { describe, expect, it } from 'vitest'
import { positionTour } from './tourPosition'

describe('Posição do guia', () => {
  it('posiciona ao lado sem cobrir um campo quando há espaço', () => {
    const result = positionTour({ left: 100, right: 300, top: 100, bottom: 150 }, { width: 1280, height: 800 }, 250)
    expect(result.left).toBeGreaterThan(result.spotlight.right)
    expect(result.top + 250).toBeLessThanOrEqual(800)
  })
  it('mantém a dica dentro de uma tela pequena e recorta alvos muito grandes', () => {
    const result = positionTour({ left: -20, right: 500, top: -100, bottom: 1200 }, { width: 375, height: 667 }, 270)
    expect(result.left).toBeGreaterThanOrEqual(16)
    expect(result.left + result.width).toBeLessThanOrEqual(359)
    expect(result.top).toBeGreaterThanOrEqual(16)
    expect(result.top + 270).toBeLessThanOrEqual(651)
    expect(result.spotlight.left).toBeGreaterThanOrEqual(0)
    expect(result.spotlight.bottom).toBeLessThan(667)
  })
  it('coloca a dica acima de um alvo no fim da tela', () => {
    const result = positionTour({ left: 20, right: 355, top: 600, bottom: 640 }, { width: 375, height: 667 }, 250)
    expect(result.top + 250).toBeLessThan(result.spotlight.top)
  })
  it('oferece posição visível quando os dados ainda não carregaram', () => {
    const result = positionTour(null, { width: 375, height: 667 }, 250)
    expect(result.spotlight).toBeNull()
    expect(result.top).toBeGreaterThan(0)
    expect(result.top + 250).toBeLessThan(667)
  })
})
