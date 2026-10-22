import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  shouldCacheRequest,
  validateWebManifest,
  registerServiceWorker,
  updateServiceWorker
} from './pwa'

const PUBLIC_DIR = join(import.meta.dirname, '../../public')

describe('PWA — Validação do Web App Manifest real', () => {
  const manifestPath = join(PUBLIC_DIR, 'manifest.webmanifest')

  it('o arquivo manifest.webmanifest existe fisicamente em public/', () => {
    expect(existsSync(manifestPath)).toBe(true)
  })

  it('o manifesto é um JSON válido e atende a todos os critérios de instalação PWA', () => {
    const rawContent = readFileSync(manifestPath, 'utf8')
    const manifest = JSON.parse(rawContent)

    const validation = validateWebManifest(manifest)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])

    expect(manifest.name).toBe('Margem.AI — Gestão Inteligente para MEI')
    expect(manifest.short_name).toBe('Margem.AI')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.background_color).toBe('#f8fafc')
    expect(manifest.theme_color).toBe('#4f46e5')
    expect(manifest.lang).toBe('pt-BR')
  })

  it('todos os ícones declarados no manifesto existem fisicamente no disco', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

    for (const icon of manifest.icons) {
      const iconRelative = icon.src.replace(/^\//, '')
      const fullIconPath = join(PUBLIC_DIR, iconRelative)
      expect(existsSync(fullIconPath), `Ícone não encontrado: ${icon.src}`).toBe(true)
    }
  })
})

describe('PWA — Função validateWebManifest', () => {
  it('detecta ausência ou formato incorreto do manifesto', () => {
    expect(validateWebManifest(null).valid).toBe(false)
    expect(validateWebManifest(undefined).valid).toBe(false)
    expect(validateWebManifest('not-an-object').valid).toBe(false)
  })

  it('identifica campos obrigatórios faltantes', () => {
    const invalid = {
      short_name: 'App',
      start_url: '/',
      display: 'standalone'
    }
    const result = validateWebManifest(invalid)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Campo "name" é obrigatório e deve ser uma string não vazia.')
    expect(result.errors).toContain('Campo "background_color" é obrigatório.')
    expect(result.errors).toContain('Campo "theme_color" é obrigatório.')
    expect(result.errors).toContain('Campo "icons" deve ser uma lista não vazia.')
  })

  it('rejeita display inválido', () => {
    const invalidDisplay = {
      name: 'Nome',
      short_name: 'Curto',
      start_url: '/',
      display: 'window-controls-overlay',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [{ src: '/icon.svg', sizes: '192x192' }]
    }
    const result = validateWebManifest(invalidDisplay)
    expect(result.valid).toBe(false)
    expect(result.errors.some((err) => err.includes('display'))).toBe(true)
  })

  it('rejeita lista de ícones sem campos essenciais (src ou sizes)', () => {
    const brokenIcons = {
      name: 'Nome',
      short_name: 'Curto',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [{ type: 'image/png' }]
    }
    const result = validateWebManifest(brokenIcons)
    expect(result.valid).toBe(false)
    expect(result.errors.some((err) => err.includes('deve possuir "src" e "sizes"'))).toBe(true)
  })
})

describe('PWA — Política de Segurança Offline (shouldCacheRequest)', () => {
  const ORIGIN = 'http://localhost:3000'

  it('rejeita métodos mutantes (POST, PUT, DELETE, PATCH)', () => {
    const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
    for (const method of mutatingMethods) {
      expect(shouldCacheRequest({ url: `${ORIGIN}/assets/index.js`, method }, ORIGIN)).toBe(false)
    }
  })

  it('rejeita estritamente qualquer requisição contendo cabeçalho Authorization', () => {
    expect(shouldCacheRequest({
      url: `${ORIGIN}/assets/index.js`,
      method: 'GET',
      hasAuthHeader: true
    }, ORIGIN)).toBe(false)

    expect(shouldCacheRequest({
      url: `${ORIGIN}/index.html`,
      method: 'GET',
      headers: { authorization: 'Bearer jwt-token-teste' }
    }, ORIGIN)).toBe(false)

    expect(shouldCacheRequest({
      url: `${ORIGIN}/index.html`,
      method: 'GET',
      headers: { Authorization: 'Bearer jwt-token-teste' }
    }, ORIGIN)).toBe(false)
  })

  it('rejeita estritamente endpoints da API financeira (/v1/*) para proteger dados do MEI', () => {
    const sensitivePaths = [
      '/v1/sales',
      '/v1/pricing/calculate',
      '/v1/costs/fixed',
      '/v1/costs/variable',
      '/v1/dashboard/monthly-flow',
      '/v1/auth/me',
      '/v1/profile',
      '/v1'
    ]

    for (const path of sensitivePaths) {
      expect(shouldCacheRequest({
        url: `${ORIGIN}${path}`,
        method: 'GET',
        hasAuthHeader: false
      }, ORIGIN)).toBe(false)
    }
  })

  it('rejeita requisições operacionais (/actuator/*)', () => {
    expect(shouldCacheRequest({ url: `${ORIGIN}/actuator/health`, method: 'GET' }, ORIGIN)).toBe(false)
    expect(shouldCacheRequest({ url: `${ORIGIN}/actuator/info`, method: 'GET' }, ORIGIN)).toBe(false)
    expect(shouldCacheRequest({ url: `${ORIGIN}/actuator`, method: 'GET' }, ORIGIN)).toBe(false)
  })

  it('rejeita requisições cross-origin', () => {
    expect(shouldCacheRequest({
      url: 'https://cdn.exemplo.com/assets/lib.js',
      method: 'GET'
    }, ORIGIN)).toBe(false)
  })

  it('permite o cacheamento seguro de App Shell e assets estáticos same-origin', () => {
    const validAssets = [
      '/',
      '/index.html',
      '/manifest.webmanifest',
      '/favicon.svg',
      '/icon-192.svg',
      '/icon-512.svg',
      '/assets/index-DJagXHzb.css',
      '/assets/index-Rlmj0jnA.js',
      '/vendas',
      '/fluxo-caixa',
      '/precificacao'
    ]

    for (const path of validAssets) {
      expect(shouldCacheRequest({
        url: `${ORIGIN}${path}`,
        method: 'GET',
        hasAuthHeader: false
      }, ORIGIN)).toBe(true)
    }
  })
})

describe('PWA — Registro e Atualização do Service Worker (registerServiceWorker)', () => {
  it('não lança erro e retorna null quando navigator.serviceWorker não está disponível', async () => {
    const result = await registerServiceWorker({})
    expect(result).toBeNull()
  })

  it('não registra em modo não-produtivo quando force é falso', async () => {
    const mockRegister = vi.fn()
    const mockNavigator = {
      serviceWorker: { register: mockRegister }
    }

    const result = await registerServiceWorker(mockNavigator, { isProd: false, force: false })
    expect(result).toBeNull()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('registra o Service Worker com escopo quando force é verdadeiro', async () => {
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn()
    }
    const mockRegister = vi.fn().mockResolvedValue(mockRegistration)
    const mockNavigator = {
      serviceWorker: { register: mockRegister }
    }

    const result = await registerServiceWorker(mockNavigator, { force: true })
    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    expect(result).toBe(mockRegistration)
  })

  it('chama onUpdate quando já existe um service worker em waiting', async () => {
    const onUpdate = vi.fn()
    const mockRegistration = {
      waiting: { postMessage: vi.fn() },
      addEventListener: vi.fn()
    }
    const mockNavigator = {
      serviceWorker: { register: vi.fn().mockResolvedValue(mockRegistration) }
    }

    await registerServiceWorker(mockNavigator, { force: true, onUpdate })
    expect(onUpdate).toHaveBeenCalledWith(mockRegistration)
  })

  it('dispara onUpdate quando novo worker é instalado e já existe controller ativo', async () => {
    let updateFoundListener = null
    let stateChangeListener = null
    const onUpdate = vi.fn()

    const mockInstalling = {
      state: 'installing',
      addEventListener: vi.fn((event, callback) => {
        if (event === 'statechange') stateChangeListener = callback
      })
    }

    const mockRegistration = {
      waiting: null,
      installing: mockInstalling,
      addEventListener: vi.fn((event, callback) => {
        if (event === 'updatefound') updateFoundListener = callback
      })
    }

    const mockNavigator = {
      serviceWorker: {
        controller: {},
        register: vi.fn().mockResolvedValue(mockRegistration)
      }
    }

    await registerServiceWorker(mockNavigator, { force: true, onUpdate })

    expect(updateFoundListener).toBeTypeOf('function')
    updateFoundListener()

    mockInstalling.state = 'installed'
    expect(stateChangeListener).toBeTypeOf('function')
    stateChangeListener()

    expect(onUpdate).toHaveBeenCalledWith(mockRegistration)
  })

  it('dispara onSuccess quando worker é instalado pela primeira vez (sem controller ativo)', async () => {
    let updateFoundListener = null
    let stateChangeListener = null
    const onSuccess = vi.fn()

    const mockInstalling = {
      state: 'installing',
      addEventListener: vi.fn((event, callback) => {
        if (event === 'statechange') stateChangeListener = callback
      })
    }

    const mockRegistration = {
      waiting: null,
      installing: mockInstalling,
      addEventListener: vi.fn((event, callback) => {
        if (event === 'updatefound') updateFoundListener = callback
      })
    }

    const mockNavigator = {
      serviceWorker: {
        controller: null,
        register: vi.fn().mockResolvedValue(mockRegistration)
      }
    }

    await registerServiceWorker(mockNavigator, { force: true, onSuccess })

    updateFoundListener()
    mockInstalling.state = 'installed'
    stateChangeListener()

    expect(onSuccess).toHaveBeenCalledWith(mockRegistration)
  })

  it('trata erros no registro chamando onError', async () => {
    const onError = vi.fn()
    const error = new Error('Falha no registro do Service Worker')
    const mockNavigator = {
      serviceWorker: { register: vi.fn().mockRejectedValue(error) }
    }

    const result = await registerServiceWorker(mockNavigator, { force: true, onError })
    expect(result).toBeNull()
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('updateServiceWorker envia comando SKIP_WAITING para o worker em espera', () => {
    const postMessage = vi.fn()
    const mockRegistration = {
      waiting: { postMessage }
    }

    const result = updateServiceWorker(mockRegistration)
    expect(result).toBe(true)
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })

    expect(updateServiceWorker(null)).toBe(false)
    expect(updateServiceWorker({})).toBe(false)
  })
})

describe('PWA — Arquivo Service Worker (public/sw.js)', () => {
  const swPath = join(PUBLIC_DIR, 'sw.js')

  it('o arquivo sw.js existe fisicamente em public/', () => {
    expect(existsSync(swPath)).toBe(true)
  })

  it('implementa o ciclo de vida completo e a segurança dos dados do MEI', () => {
    const swContent = readFileSync(swPath, 'utf8')

    expect(swContent).toContain("addEventListener('install'")
    expect(swContent).toContain("addEventListener('activate'")
    expect(swContent).toContain("addEventListener('fetch'")
    expect(swContent).toContain("addEventListener('message'")
    expect(swContent).toContain('SKIP_WAITING')

    // Proteção de endpoints sensíveis
    expect(swContent).toContain('/v1/')
    expect(swContent).toContain('/actuator/')
    expect(swContent).toContain('authorization')

    // Estratégias de cache
    expect(swContent).toContain('caches.open')
    expect(swContent).toContain('caches.match')
  })
})
