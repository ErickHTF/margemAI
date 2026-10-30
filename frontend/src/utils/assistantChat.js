// Só mensagens trocadas de fato com o assistente vão para a API; avisos de erro ficam apenas na tela.
export const toApiHistory = (messages = []) =>
  messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && !message.error)
    .map(({ role, content }) => ({ role, content }))

const BOLD = /\*\*(.+?)\*\*/g
const LIST_ITEM = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/

export const parseInline = (text = '') => {
  const segments = []
  let last = 0
  for (const match of text.matchAll(BOLD)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), bold: false })
    segments.push({ text: match[1], bold: true })
    last = match.index + match[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false })
  return segments
}

// Converte o texto do assistente (markdown simples) em blocos que a tela desenha sem usar HTML cru.
export const parseReply = (text = '') =>
  text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean)
      const heading = lines.length === 1 && lines[0].match(/^#{1,6}\s+(.*)$/)
      if (heading) return { type: 'heading', segments: parseInline(heading[1].replace(/\*\*/g, '')) }
      const items = lines.map((line) => line.match(LIST_ITEM))
      if (items.every(Boolean)) {
        return {
          type: 'list',
          ordered: items.every((item) => item[1]),
          items: items.map((item) => parseInline(item[2]))
        }
      }
      return { type: 'paragraph', lines: lines.map((line) => parseInline(line.replace(/^#{1,6}\s+/, ''))) }
    })
