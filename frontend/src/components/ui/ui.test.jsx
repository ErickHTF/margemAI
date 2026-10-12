import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Trash2 } from 'lucide-react'
import { Button, Field, IconButton, Input, Notice, SegmentedControl, Select } from './index'

const render = element => renderToStaticMarkup(element)
const attr = (html, name) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1]

describe('Primitivos de interface', () => {
  it('Button não envia formulário por padrão e respeita type explícito', () => {
    expect(render(<Button>Salvar</Button>)).toContain('type="button"')
    expect(render(<Button type="submit">Salvar</Button>)).toContain('type="submit"')
  })

  it('Button em carregamento fica desabilitado e sinaliza ocupado', () => {
    const html = render(<Button loading>Salvando...</Button>)
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
  })

  it('IconButton exige um rótulo acessível', () => {
    const html = render(<IconButton label="Excluir venda" Icon={Trash2} />)
    expect(attr(html, 'aria-label')).toBe('Excluir venda')
    expect(html).toContain('type="button"')
    expect(() => render(<IconButton Icon={Trash2} />)).toThrow()
  })

  it('Field liga rótulo, erro e dica ao controle', () => {
    const html = render(
      <Field label="Nome" error="Informe o nome." hint="Como aparece nos relatórios.">
        <Input name="name" />
      </Field>
    )
    const id = attr(html, 'for')
    expect(id).toBeTruthy()
    expect(html).toContain(`id="${id}" aria-invalid="true" aria-describedby="${id}-error ${id}-hint"`)
    expect(html).toContain(`id="${id}-error"`)
    expect(html).toContain(`id="${id}-hint"`)
  })

  it('Field preserva o id do controle e não marca inválido sem erro', () => {
    const html = render(<Field label="Tipo"><Select id="tipo"><option>A</option></Select></Field>)
    expect(attr(html, 'for')).toBe('tipo')
    expect(html).not.toContain('aria-invalid')
    expect(html).not.toContain('aria-describedby')
  })

  it('Field com controle composto usa htmlFor sem alterar o contêiner', () => {
    const html = render(
      <Field label="Quantidade" htmlFor="qtd">
        <div className="grupo"><Input id="qtd" /></div>
      </Field>
    )
    expect(attr(html, 'for')).toBe('qtd')
    expect(html).toContain('<div class="grupo"><input id="qtd"')
  })

  it('Notice anuncia erros como alerta e demais tons como status', () => {
    expect(attr(render(<Notice tone="rose">Falhou</Notice>), 'role')).toBe('alert')
    expect(attr(render(<Notice tone="emerald">Salvo</Notice>), 'role')).toBe('status')
    expect(attr(render(<Notice tone="amber" role="note">Atenção</Notice>), 'role')).toBe('note')
  })

  it('SegmentedControl indica a opção selecionada', () => {
    const html = render(
      <SegmentedControl label="Período" value={6} onChange={() => {}} options={[{ value: 3, label: '3 meses' }, { value: 6, label: '6 meses' }]} />
    )
    expect(html).toContain('role="group"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toMatch(/aria-pressed="true"[^>]*>6 meses/)
  })
})
