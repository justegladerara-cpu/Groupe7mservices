import { Link } from 'react-router-dom'
import { ShoppingCart, TrendingUp, Clock, AlertTriangle, Repeat, Wallet, Target, ArrowRight } from 'lucide-react'
import { useStore, useCurrentUser } from '../../lib/store'
import { Stat, PageTitle, StatusBadge } from '../../components/ui'
import { orderEconomics } from '../../lib/pricing'
import { useMoney, daysBetween, fmtDate } from '../../lib/format'
import { STATUS_FLOW, STATUS_LABEL } from '../../lib/constants'

const monthKey = (iso: string) => iso.slice(0, 7)
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export default function Dashboard() {
  const user = useCurrentUser()!
  const orders = useStore((s) => s.orders)
  const claims = useStore((s) => s.claims)
  const settings = useStore((s) => s.settings)
  const links = useStore((s) => s.linkRequests)
  const money = useMoney()

  const valid = orders.filter((o) => o.status !== 'annulee' && o.paidAt)
  const now = new Date()
  const thisM = now.toISOString().slice(0, 7)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().slice(0, 7)
  const monthOrders = valid.filter((o) => monthKey(o.createdAt) === thisM)
  const prevOrders = valid.filter((o) => monthKey(o.createdAt) === prev)
  const ecos = valid.map(orderEconomics)
  const avgMargin = ecos.length ? ecos.reduce((a, e) => a + e.margin, 0) / ecos.length : 0
  const avgMarginPct = ecos.length ? ecos.reduce((a, e) => a + e.marginPct, 0) / ecos.length : 0
  const delivered = orders.filter((o) => o.status === 'livree' && o.deliveredAt)
  const avgDelay = delivered.length ? delivered.reduce((a, o) => a + daysBetween(o.createdAt, o.deliveredAt!), 0) / delivered.length : 0
  const onTime = delivered.length ? (delivered.filter((o) => o.deliveredAt! <= o.promisedDate).length / delivered.length) * 100 : 0
  const claimRate = valid.length ? (claims.length / valid.length) * 100 : 0
  const byCustomer = new Map<string, number>()
  valid.forEach((o) => byCustomer.set(o.customerId, (byCustomer.get(o.customerId) ?? 0) + 1))
  const repeatRate = byCustomer.size ? ([...byCustomer.values()].filter((n) => n > 1).length / byCustomer.size) * 100 : 0
  const breakEven = avgMargin > 0 ? Math.ceil(settings.monthlyFixedCosts / avgMargin) : 0
  const monthRevenue = monthOrders.reduce((a, o) => a + o.total, 0)
  const monthMargin = monthOrders.map(orderEconomics).reduce((a, e) => a + e.margin, 0)

  // 6 derniers mois
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 15); return { key: d.toISOString().slice(0, 7), label: MONTHS[d.getMonth()] } })
  const series = months.map((m) => { const os = valid.filter((o) => monthKey(o.createdAt) === m.key); return { ...m, count: os.length, margin: os.map(orderEconomics).reduce((a, e) => a + e.margin, 0) } })
  const maxCount = Math.max(1, ...series.map((s) => s.count), breakEven)

  const queue = [
    { label: 'Paiements en attente', n: orders.filter((o) => o.status === 'attente_paiement').length, to: '/admin/commandes?status=attente_paiement' },
    { label: 'Liens à chiffrer', n: links.filter((l) => l.status === 'nouvelle').length, to: '/admin/liens' },
    { label: 'Commandes à acheter', n: orders.filter((o) => o.status === 'paiement_confirme').length, to: '/admin/achats' },
    { label: 'Prêtes à expédier', n: orders.filter((o) => o.status === 'achat_fournisseur').length, to: '/admin/expeditions' },
    { label: 'À livrer', n: orders.filter((o) => o.status === 'dedouanement').length, to: '/admin/livraisons' },
    { label: 'Réclamations ouvertes', n: claims.filter((c) => c.status === 'ouverte' || c.status === 'en_cours').length, to: '/admin/reclamations' },
  ]
  const late = orders.filter((o) => !['livree', 'annulee'].includes(o.status) && new Date(o.promisedDate) < now)

  return (
    <div>
      <PageTitle title={`Bonjour ${user.name.split(' ')[0]}`} sub={`Vue d’ensemble au ${fmtDate(now.toISOString())} · ${settings.launchCity}`} />

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {queue.map((q) => (
          <Link key={q.label} to={q.to} className={`rounded-2xl border p-3 transition hover:shadow ${q.n ? 'border-gold-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="text-2xl font-bold text-slate-900">{q.n}</div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">{q.label}<ArrowRight size={12} /></div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Les chiffres qui disent la vérité sur le modèle</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Commandes ce mois" value={monthOrders.length} sub={`${prevOrders.length} le mois dernier`} icon={<ShoppingCart size={16} />} />
        <Stat label="Marge nette / commande" value={money(avgMargin)} sub={`${avgMarginPct.toFixed(1)} % (cible ${settings.targetMarginPct} %)`} icon={<TrendingUp size={16} />} tone={avgMarginPct >= settings.targetMarginPct ? 'green' : 'amber'} />
        <Stat label="Délai commande → livraison" value={`${avgDelay.toFixed(1)} j`} sub={`${onTime.toFixed(0)} % dans le délai promis`} icon={<Clock size={16} />} tone="sky" />
        <Stat label="Taux de réclamation" value={`${claimRate.toFixed(1)} %`} sub={`${claims.length} réclamations`} icon={<AlertTriangle size={16} />} tone={claimRate > 5 ? 'red' : 'green'} />
        <Stat label="Commandes répétées" value={`${repeatRate.toFixed(0)} %`} sub={`des ${byCustomer.size} clients ont recommandé`} icon={<Repeat size={16} />} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold">Commandes payées par mois</h3>
            <span className="flex items-center gap-2 text-xs text-slate-500"><span className="h-0.5 w-5 border-t-2 border-dashed border-rose-500" />Seuil de rentabilité ({breakEven}/mois)</span>
          </div>
          <div className="relative mt-6 flex h-56 items-end gap-3">
            <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-rose-400" style={{ bottom: `${(breakEven / maxCount) * 100}%` }} />
            {series.map((s) => (
              <div key={s.key} className="flex h-full flex-1 flex-col items-center justify-end">
                <div className="mb-1 text-xs font-bold text-slate-700">{s.count}</div>
                <div className={`w-full max-w-[56px] rounded-t-lg ${s.key === thisM ? 'bg-gold-500' : 'bg-brand-600'}`} style={{ height: `${(s.count / maxCount) * 100}%` }} title={`Marge : ${money(s.margin)}`} />
                <div className="mt-2 text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-bold"><Target size={18} className="text-brand-700" />Seuil de rentabilité</h3>
          <p className="mt-1 text-xs text-slate-500">Coûts fixes mensuels ÷ marge nette moyenne par commande</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Coûts fixes / mois</span><b>{money(settings.monthlyFixedCosts)}</b></div>
            <div className="flex justify-between"><span>Marge nette moyenne</span><b>{money(avgMargin)}</b></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base"><span>Commandes minimum / mois</span><b className="text-brand-800">{breakEven}</b></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500"><span>Ce mois : {monthOrders.length} commandes</span><span>{breakEven ? Math.round((monthOrders.length / breakEven) * 100) : 0} %</span></div>
            <div className="mt-1 h-3 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${monthOrders.length >= breakEven ? 'bg-emerald-500' : 'bg-gold-500'}`} style={{ width: `${Math.min(100, breakEven ? (monthOrders.length / breakEven) * 100 : 0)}%` }} /></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2"><div className="text-xs text-slate-500">CA du mois</div><div className="font-bold">{money(monthRevenue)}</div></div>
            <div className="rounded-xl bg-slate-50 p-2"><div className="text-xs text-slate-500">Marge du mois</div><div className="font-bold">{money(monthMargin)}</div></div>
          </div>
          <Link to="/admin/parametres" className="mt-3 block text-xs font-semibold text-brand-700">Ajuster les coûts fixes →</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-bold">Commandes en cours par étape</h3>
          <div className="mt-4 space-y-2">
            {STATUS_FLOW.slice(0, 6).map((s) => {
              const n = orders.filter((o) => o.status === s).length
              return (
                <Link key={s} to={`/admin/commandes?status=${s}`} className="flex items-center gap-3 text-sm hover:opacity-80">
                  <span className="w-48 shrink-0 truncate text-slate-600">{STATUS_LABEL[s]}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${Math.min(100, n * 5)}%` }} /></div>
                  <b className="w-8 text-right">{n}</b>
                </Link>
              )
            })}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-bold"><Wallet size={18} className="text-rose-600" />Commandes en retard sur la promesse</h3>
          {!late.length && <p className="mt-3 text-sm text-emerald-700">Aucune commande en retard. La promesse est tenue 👏</p>}
          <div className="mt-3 divide-y divide-slate-100">
            {late.slice(0, 6).map((o) => (
              <Link key={o.id} to={`/admin/commandes/${o.id}`} className="flex items-center justify-between py-2 text-sm">
                <span className="font-semibold">{o.number}</span><StatusBadge status={o.status} /><span className="text-xs text-rose-600">promis le {fmtDate(o.promisedDate)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
