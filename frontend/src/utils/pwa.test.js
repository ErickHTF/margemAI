import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import {
  shouldCacheRequest,
  validateWebManifest,
  registerServiceWorker,
  updateServiceWorker
} from './pwa'
import { injectPrecacheManifest } from '../../swPrecache.js'

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

const SW_ORIGIN = 'https://app.margem.ai'

function createCacheStorage() {
  const stores = new Map()
  const keyOf = (request) => new URL(typeof request === 'string' ? request : request.url, SW_ORIGIN).href
  const openStore = (name) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const entries = stores.get(name)
    return {
      put: async (request, response) => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        entries.set(keyOf(request), response)
      },
      addAll: async (requests) => {
        requests.forEach((request) => entries.set(keyOf(request), new Response(`precache ${request}`)))
      },
      match: async (request) => entries.get(keyOf(request))
    }
  }
  return {
    stores,
    open: async (name) => openStore(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (request) => {
      for (const name of stores.keys()) {
        const found = await openStore(name).match(request)
        if (found) return found
      }
      return undefined
    },
    urls: () => [...stores.values()].flatMap((entries) => [...entries.keys()])
  }
}

function loadServiceWorker({ source = readFileSync(join(PUBLIC_DIR, 'sw.js'), 'utf8'), fetchImpl } = {}) {
  const listeners = {}
  const caches = createCacheStorage()
  const fetchMock = vi.fn(fetchImpl ?? ((request) => Promise.resolve(new Response(`rede ${request.url}`))))
  const self = {
    location: { origin: SW_ORIGIN },
    addEventListener: (type, listener) => { listeners[type] = listener },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(() => Promise.resolve()) }
  }
  runInNewContext(source, { self, caches, fetch: fetchMock, URL, Response, Promise, setTimeout })

  const dispatch = async (type, extra = {}) => {
    const lifetime = []
    let response
    const event = {
      ...extra,
      waitUntil: (promise) => { lifetime.push(promise) },
      respondWith: vi.fn((promise) => { response = Promise.resolve(promise) })
    }
    listeners[type](event)
    const resolved = response ? await response : undefined
    await Promise.all(lifetime)
    return { event, response: resolved }
  }

  const fetchRequest = ({ path, method = 'GET', mode = 'no-cors', headers = {} }) => dispatch('fetch', {
    request: { url: new URL(path, SW_ORIGIN).href, method, mode, headers: new Headers(headers) }
  })

  return { caches, fetchMock, dispatch, fetchRequest }
}

describe('PWA — Service Worker real (public/sw.js)', () => {
  it.each([
    ['POST de venda', { path: '/v1/sales', method: 'POST' }],
    ['GET da API financeira', { path: '/v1/dashboard/monthly-flow' }],
    ['GET da raiz da API', { path: '/v1' }],
    ['GET do actuator', { path: '/actuator/health' }],
    ['GET de asset com Authorization', { path: '/assets/index-a1.js', headers: { Authorization: 'Bearer jwt-teste' } }],
    ['PUT em asset same-origin', { path: '/assets/index-a1.js', method: 'PUT' }],
    ['GET cross-origin', { path: 'https://cdn.exemplo.com/lib.js' }]
  ])('não intercepta nem grava em cache: %s', async (_, request) => {
    const sw = loadServiceWorker()

    const { event } = await sw.fetchRequest(request)

    expect(event.respondWith).not.toHaveBeenCalled()
    expect(sw.fetchMock).not.toHaveBeenCalled()
    expect(sw.caches.urls()).toEqual([])
  })

  it('grava o asset da rede no cache dentro do tempo de vida do evento', async () => {
    const sw = loadServiceWorker()

    const { response } = await sw.fetchRequest({ path: '/assets/index-b2.js' })

    expect(await response.text()).toBe(`rede ${SW_ORIGIN}/assets/index-b2.js`)
    expect(sw.caches.urls()).toEqual([`${SW_ORIGIN}/assets/index-b2.js`])
  })

  it('responde do cache e revalida o asset antes de o worker encerrar', async () => {
    const sw = loadServiceWorker()
    await sw.dispatch('install')

    const { response } = await sw.fetchRequest({ path: '/favicon.svg' })

    expect(await response.text()).toBe('precache /favicon.svg')
    const [cacheName] = sw.caches.stores.keys()
    const revalidated = sw.caches.stores.get(cacheName).get(`${SW_ORIGIN}/favicon.svg`)
    expect(await revalidated.text()).toBe(`rede ${SW_ORIGIN}/favicon.svg`)
  })

  it('grava a navegação no cache e usa o index.html quando offline', async () => {
    const online = loadServiceWorker()
    await online.fetchRequest({ path: '/vendas', mode: 'navigate' })
    expect(online.caches.urls()).toEqual([`${SW_ORIGIN}/vendas`])

    const offline = loadServiceWorker({ fetchImpl: () => Promise.reject(new TypeError('offline')) })
    await offline.dispatch('install')
    const { response } = await offline.fetchRequest({ path: '/precificacao', mode: 'navigate' })
    expect(await response.text()).toBe('precache /index.html')
  })

  it('precacheia na instalação os bundles injetados no build', async () => {
    const assets = ['/assets/index-c3.js', '/assets/index-d4.css']
    const source = injectPrecacheManifest(readFileSync(join(PUBLIC_DIR, 'sw.js'), 'utf8'), assets)
    const sw = loadServiceWorker({ source })

    await sw.dispatch('install')

    expect(sw.caches.urls()).toEqual(expect.arrayContaining(assets.map((asset) => `${SW_ORIGIN}${asset}`)))
  })

  it('muda o nome do cache quando os bundles do build mudam', async () => {
    const swSource = readFileSync(join(PUBLIC_DIR, 'sw.js'), 'utf8')
    const cacheNameAfterInstall = async (assets) => {
      const sw = loadServiceWorker({ source: injectPrecacheManifest(swSource, assets) })
      await sw.dispatch('install')
      return [...sw.caches.stores.keys()][0]
    }

    expect(await cacheNameAfterInstall(['/assets/index-e5.js']))
      .not.toBe(await cacheNameAfterInstall(['/assets/index-f6.js']))
  })

  it('falha o build quando o sw.js perde os marcadores de precache', () => {
    expect(() => injectPrecacheManifest("const CACHE_NAME = 'x';", ['/assets/a.js'])).toThrow(/BUILD_ID\/BUILD_ASSETS/)
  })
})
