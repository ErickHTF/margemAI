export const cx = (...classes) => classes.filter(Boolean).join(' ')

export const hasWidth = className => /(^|\s)(w-|flex-1)/.test(className || '')
