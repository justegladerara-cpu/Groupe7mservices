import type { ReactNode } from 'react'
import { X, Check, Clock, Bot, Users, Truck, Store } from 'lucide-react'
import type { OrderStatus, Order } from '../lib/types'
import { STATUS_COLOR, STATUS_LABEL, STATUS_FLOW, STATUS_OWNER, STATUS_CLIENT_TEXT } from '../lib/constants'
import { fmtDateTime } from '../lib/format'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'violet' | 'sky' }) {
  const t = { slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-rose-100 text-rose-800', violet: 'bg-brand-100 text-brand-800', sky: 'bg-sky-100 text-sky-800' }[tone]
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Stat({ label, value, sub, icon, tone = 'brand' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: 'brand' | 'green' | 'amber' | 'red' | 'sky' }) {
  const t = { brand: 'bg-brand-100 text-brand-700', green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-rose-100 text-rose-700', sky: 'bg-sky-100 text-sky-700' }[tone]
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        {icon && <div className={`rounded-lg p-1.5 ${t}`}>{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <div className="font-semibold text-slate-800">{title}</div>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const OWNER_ICON = { 'AUTOMATISÉ': <Bot size={12} />, 'PILOTÉ PAR ÉQUIPE': <Users size={12} />, 'PARTENAIRE': <Truck size={12} />, 'PARTENAIRE LOCAL': <Store size={12} />, '—': null }

export function OrderTimeline({ order, staff }: { order: Order; staff?: boolean }) {
  const reached = new Map(order.history.map((h) => [h.status, h]))
  const current = STATUS_FLOW.indexOf(order.status)
  return (
    <ol className="relative space-y-0">
      {STATUS_FLOW.map((s, i) => {
        const h = reached.get(s)
        const done = !!h && order.status !== 'annulee'
        const isCurrent = i === current
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {i < STATUS_FLOW.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5 ${done && i < current ? 'bg-brand-500' : 'bg-slate-200'}`} />}
            <span className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-400'} ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}>
              {done ? <Check size={14} /> : <Clock size={12} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{STATUS_LABEL[s]}</span>
                {staff && <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{OWNER_ICON[STATUS_OWNER[s]]}{STATUS_OWNER[s]}</span>}
              </div>
              {h && <div className="text-xs text-slate-500">{fmtDateTime(h.at)}{staff && ` · ${h.by}`}</div>}
              {isCurrent && !staff && <p className="mt-1 text-sm text-slate-600">{STATUS_CLIENT_TEXT[s]}</p>}
              {h?.note && staff && <p className="mt-0.5 text-xs text-slate-500">{h.note}</p>}
            </div>
          </li>
        )
      })}
      {order.status === 'annulee' && <li className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Commande annulée. {order.history.find((h) => h.status === 'annulee')?.note}</li>}
    </ol>
  )
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" onClick={() => onChange?.(i)} className={onChange ? 'cursor-pointer' : ''}>
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L1.3 7.7l6.1-.6z" fill={i <= value ? '#f59e0b' : '#e2e8f0'} />
        </svg>
      ))}
    </span>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-[11px] font-black tracking-tight text-white shadow">HHH</span>
      <span className={`font-display text-lg font-extrabold ${light ? 'text-white' : 'text-slate-900'}`}>HHH<span className="text-gold-500">Group</span></span>
    </span>
  )
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{children}</div>
}
