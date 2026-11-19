import { useStore } from './store'

export function fmtMoney(v: number, symbol = 'FCFA') {
  return `${Math.round(v).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} ${symbol}`
}

export function useMoney() {
  const symbol = useStore((s) => s.settings.currencySymbol)
  return (v: number) => fmtMoney(v, symbol)
}

export function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function waLink(phone: string, text: string) {
  const p = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`
}
