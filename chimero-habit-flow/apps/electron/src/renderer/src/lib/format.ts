export function num(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits
  return rounded.toLocaleString('en', { maximumFractionDigits: digits })
}

export function signed(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const text = num(Math.abs(value), digits)
  if (text === '0') return '0'
  return `${value > 0 ? '+' : '−'}${text}`
}

export function withUnit(value: number | null | undefined, unit: string | null | undefined, digits = 1): string {
  const text = num(value, digits)
  if (text === '—' || !unit) return text
  return unit.length <= 2 || unit === 'kcal' ? `${text} ${unit}` : `${text} ${unit}`
}

export function percent(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${num(value * 100, digits)}%`
}

export function pValue(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return '—'
  if (p < 0.001) return '< 0.001'
  return p.toFixed(p < 0.01 ? 3 : 2)
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString('en')} ${count === 1 ? singular : pluralForm}`
}

export function bytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function duration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] ?? '')).toUpperCase()
}

const KG_PER_LB = 0.45359237

export function convertWeight(value: number, from: 'kg' | 'lb' | string | null, to: 'kg' | 'lb'): number {
  const unit = from === 'lb' ? 'lb' : 'kg'
  if (unit === to) return value
  return to === 'kg' ? value * KG_PER_LB : value / KG_PER_LB
}

export function convertLength(value: number, from: 'cm' | 'in' | string | null, to: 'cm' | 'in'): number {
  const unit = from === 'in' ? 'in' : 'cm'
  if (unit === to) return value
  return to === 'cm' ? value * 2.54 : value / 2.54
}
