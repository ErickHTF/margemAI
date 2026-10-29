import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import * as tours from './data/menuTours'

// Testes de consistência entre arquivos: pegam o "esqueci de cadastrar X" antes da revisão.
const SRC = import.meta.dirname
const read = (path) => readFileSync(join(SRC, path), 'utf8')
const listFiles = (dir, ext) =>
  readdirSync(join(SRC, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(ext) && !/\.test\.jsx?$/.test(entry.name))
    .map((entry) => relative(SRC, join(entry.parentPath, entry.name)))

const app = read('App.jsx')
const navBlock = app.match(/const NAV_GROUPS = \[([\s\S]*?)\n\]/)[1]
// Só as chaves dentro de `items: [...]` (as chaves dos grupos ficam de fora).
const navKeys = [...navBlock.matchAll(/items:\s*\[([\s\S]*?)\]/g)].flatMap((items) =>
  [...items[1].matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1])
)
const renderBlock = app.match(/const renderSection = \(\) => \{([\s\S]*?)\n {2}\}/)[1]
const caseKeys = [...renderBlock.matchAll(/case '([^']+)':/g)].map((m) => m[1])
const defaultScreen = renderBlock.match(/default:\s*return <(\w+)/)?.[1]
const fallbackKey = app.match(/\? key : '([^']+)'/)?.[1]

const jsxFiles = listFiles('.', '.jsx')
const jsxSource = jsxFiles.map(read).join('\n')

describe('Consistência do menu e das telas', () => {
  it('lê o menu do App.jsx', () => {
    expect(navKeys.length).toBeGreaterThanOrEqual(5)
    expect(fallbackKey).toBeTruthy()
  })

  it('todo item do menu tem tela em renderSection (o item padrão usa o default do switch)', () => {
    const missing = navKeys.filter((key) => !caseKeys.includes(key) && key !== fallbackKey)
    expect(missing, 'itens do menu sem `case` em renderSection').toEqual([])
    expect(defaultScreen, 'renderSection precisa de um default para o item padrão').toBeTruthy()
  })

  it('todo item do menu tem guia rápido em MENU_TOURS', () => {
    expect(navKeys.filter((key) => !tours.MENU_TOURS[key]), 'itens do menu sem guia em data/menuTours.js').toEqual([])
  })

  it('todo guia de MENU_TOURS corresponde a um item do menu', () => {
    expect(Object.keys(tours.MENU_TOURS).filter((key) => !navKeys.includes(key))).toEqual([])
  })

  it('todo alvo de guia existe como data-tour em algum componente', () => {
    const tourTargets = Object.values(tours)
      .flatMap((value) => (Array.isArray(value) ? [value] : Object.values(value)))
      .flat()
      .map((step) => step.target)
    // Alvos escritos direto no código (ex.: passo alternativo "sales-new" e seletores em SectionTour.jsx).
    const sectionTour = read('components/SectionTour.jsx')
    const hardCoded = [
      ...[...sectionTour.matchAll(/target:\s*'([^']+)'/g)].map((m) => m[1]),
      ...[...sectionTour.matchAll(/data-tour="([^"$]+)"/g)].map((m) => m[1])
    ]
    expect(hardCoded).toContain('sales-new')
    const missing = [...new Set([...tourTargets, ...hardCoded])].filter((target) => !jsxSource.includes(`data-tour="${target}"`))
    expect(missing, 'alvos de guia sem data-tour correspondente').toEqual([])
  })

  it('toda tela do menu usa PageHeader', () => {
    const imports = Object.fromEntries(
      [...app.matchAll(/import (\w+) from '(\.\/components\/[^']+)'/g)].map((m) => [m[1], m[2]])
    )
    const screens = [...renderBlock.matchAll(/return <(\w+)/g)].map((m) => m[1])
    expect(screens.length).toBe(caseKeys.length + 1)
    const withoutHeader = screens.filter((name) => {
      const path = imports[name]
      expect(path, `import de ${name} não encontrado no App.jsx`).toBeTruthy()
      return !readFileSync(resolve(SRC, `${path}.jsx`), 'utf8').includes('<PageHeader')
    })
    expect(withoutHeader, 'telas sem <PageHeader>').toEqual([])
  })
})

describe('Pílulas SEBRAE só no cabeçalho', () => {
  it('TipButton só aparece em telas com PageHeader, passado pela prop tip', () => {
    const offenders = listFiles('components', '.jsx')
      .filter((path) => !path.startsWith('components/ui/') && path !== 'components/TipButton.jsx')
      .filter((path) => {
        const source = read(path)
        const total = source.match(/<TipButton\b/g)?.length ?? 0
        const inHeader = source.match(/tip=\{\s*<TipButton\b/g)?.length ?? 0
        return total !== inHeader
      })
    expect(offenders, 'use <PageHeader tip={<TipButton … />}> em vez de TipButton no meio da tela').toEqual([])
  })
})

describe('Confirmações usam ConfirmDialog', () => {
  it('nenhum componente (fora de components/ui) usa window.confirm', () => {
    const offenders = listFiles('components', '.jsx')
      .filter((path) => !path.startsWith('components/ui/'))
      .filter((path) => read(path).includes('window.confirm('))
    expect(offenders, 'troque window.confirm por ConfirmDialog').toEqual([])
  })
})
