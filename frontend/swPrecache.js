import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const BUILD_ID_PLACEHOLDER = "const BUILD_ID = 'dev';"
const BUILD_ASSETS_PLACEHOLDER = 'const BUILD_ASSETS = [];'

export function injectPrecacheManifest(swSource, assets) {
  if (!swSource.includes(BUILD_ID_PLACEHOLDER) || !swSource.includes(BUILD_ASSETS_PLACEHOLDER)) {
    throw new Error('sw.js sem os marcadores BUILD_ID/BUILD_ASSETS: o precache dos bundles não pode ser gerado.')
  }
  const sorted = [...assets].sort()
  const buildId = createHash('sha256').update(sorted.join('\n')).digest('hex').slice(0, 12)
  return swSource
    .replace(BUILD_ID_PLACEHOLDER, `const BUILD_ID = '${buildId}';`)
    .replace(BUILD_ASSETS_PLACEHOLDER, `const BUILD_ASSETS = ${JSON.stringify(sorted)};`)
}

export function swPrecache() {
  let config
  return {
    name: 'margemai-sw-precache',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    writeBundle(options, bundle) {
      const outDir = options.dir || config.build.outDir
      const assets = Object.keys(bundle)
        .filter((fileName) => !fileName.endsWith('.html') && !fileName.endsWith('.map'))
        .map((fileName) => `${config.base}${fileName}`)
      const swPath = join(outDir, 'sw.js')
      writeFileSync(swPath, injectPrecacheManifest(readFileSync(swPath, 'utf8'), assets))
    }
  }
}
