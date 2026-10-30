/**
 * Utilitários de validação e registro de Progressive Web App (PWA) para o Margem.AI.
 * 
 * Estratégia de Segurança Offline:
 * - App Shell Instalável: index.html e assets estáticos são cacheados para carregamento rápido.
 * - Proteção Estrita de Dados Financeiros: requisições autenticadas, chamadas à API (/v1/*)
 *   e endpoints operacionais (/actuator/*) NUNCA são cacheados em disco pelo Service Worker.
 */

const VALID_DISPLAYS = ['standalone', 'fullscreen', 'minimal-ui', 'browser']

/**
 * Avalia se uma requisição deve ser cacheada pelo Service Worker.
 * Apenas requisições GET same-origin para app shell/assets estáticos são permitidas.
 * Dados sensíveis de API (/v1/), actuator, requisições autenticadas ou métodos mutantes são estritamente rejeitados.
 *
 * @param {Request|{ url: string, method?: string, hasAuthHeader?: boolean, headers?: any }} req
 * @param {string} [customOrigin]
 * @returns {boolean}
 */
export function shouldCacheRequest(req, customOrigin) {
  if (!req) return false

  let urlStr = ''
  let method = 'GET'
  let hasAuthHeader = false

  if (typeof req === 'string') {
    urlStr = req
  } else if (typeof req === 'object') {
    urlStr = req.url || ''
    method = (req.method || 'GET').toUpperCase()

    if (typeof req.hasAuthHeader === 'boolean') {
      hasAuthHeader = req.hasAuthHeader
    } else if (req.headers) {
      if (typeof req.headers.has === 'function') {
        hasAuthHeader = req.headers.has('authorization') || req.headers.has('Authorization')
      } else if (typeof req.headers.get === 'function') {
        hasAuthHeader = Boolean(req.headers.get('authorization') || req.headers.get('Authorization'))
      } else if (typeof req.headers === 'object') {
        hasAuthHeader = Boolean(req.headers.authorization || req.headers.Authorization)
      }
    }
  }

  // 1. Apenas requisições GET podem ser cacheadas
  if (method !== 'GET') {
    return false
  }

  // 2. Requisições autenticadas com token JWT nunca devem ir para cache storage
  if (hasAuthHeader) {
    return false
  }

  const defaultOrigin = typeof location !== 'undefined' ? location.origin : 'http://localhost:3000'
  const expectedOrigin = customOrigin ? new URL(customOrigin, defaultOrigin).origin : defaultOrigin

  let parsedUrl
  try {
    parsedUrl = new URL(urlStr, expectedOrigin)
  } catch {
    return false
  }

  // 3. Apenas requisições same-origin
  if (parsedUrl.origin !== expectedOrigin) {
    return false
  }

  // 4. Bloqueio absoluto de dados financeiros do MEI e infraestrutura backend
  const pathname = parsedUrl.pathname
  if (
    pathname === '/v1' ||
    pathname.startsWith('/v1/') ||
    pathname === '/actuator' ||
    pathname.startsWith('/actuator/')
  ) {
    return false
  }

  return true
}

/**
 * Valida o manifesto Web App quanto aos critérios obrigatórios de instalação PWA.
 *
 * @param {object} manifest
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWebManifest(manifest) {
  const errors = []

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifesto inválido: esperado um objeto JSON.'] }
  }

  if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.trim() === '') {
    errors.push('Campo "name" é obrigatório e deve ser uma string não vazia.')
  }

  if (!manifest.short_name || typeof manifest.short_name !== 'string' || manifest.short_name.trim() === '') {
    errors.push('Campo "short_name" é obrigatório e deve ser uma string não vazia.')
  }

  if (!manifest.start_url || typeof manifest.start_url !== 'string') {
    errors.push('Campo "start_url" é obrigatório.')
  }

  if (!manifest.display || !VALID_DISPLAYS.includes(manifest.display)) {
    errors.push(`Campo "display" deve ser um dos seguintes valores: ${VALID_DISPLAYS.join(', ')}.`)
  }

  if (!manifest.background_color || typeof manifest.background_color !== 'string') {
    errors.push('Campo "background_color" é obrigatório.')
  }

  if (!manifest.theme_color || typeof manifest.theme_color !== 'string') {
    errors.push('Campo "theme_color" é obrigatório.')
  }

  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    errors.push('Campo "icons" deve ser uma lista não vazia.')
  } else {
    manifest.icons.forEach((icon, index) => {
      if (!icon || !icon.src || !icon.sizes) {
        errors.push(`Ícone no índice ${index} deve possuir "src" e "sizes".`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Registra o Service Worker no navegador e configura escuta de atualizações.
 *
 * @param {Navigator} [navigatorObj]
 * @param {object} [options]
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export function registerServiceWorker(
  navigatorObj = (typeof navigator !== 'undefined' ? navigator : undefined),
  options = {}
) {
  const {
    swUrl = '/sw.js',
    scope = '/',
    isProd = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : false,
    force = false,
    onUpdate,
    onSuccess,
    onError
  } = options

  if (!navigatorObj || !navigatorObj.serviceWorker) {
    return Promise.resolve(null)
  }

  // Em ambiente de desenvolvimento local Vite, não registramos a menos que forçado
  if (!isProd && !force) {
    return Promise.resolve(null)
  }

  return navigatorObj.serviceWorker
    .register(swUrl, { scope })
    .then((registration) => {
      if (registration.waiting && typeof onUpdate === 'function') {
        onUpdate(registration)
      }

      if (typeof registration.addEventListener === 'function') {
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigatorObj.serviceWorker.controller) {
                if (typeof onUpdate === 'function') {
                  onUpdate(registration)
                }
              } else if (typeof onSuccess === 'function') {
                onSuccess(registration)
              }
            }
          })
        })
      }

      return registration
    })
    .catch((error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
      return null
    })
}

/**
 * Aciona o Service Worker em espera para assumir o controle imediatamente.
 *
 * @param {ServiceWorkerRegistration} registration
 * @returns {boolean}
 */
export function updateServiceWorker(registration) {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    return true
  }
  return false
}
