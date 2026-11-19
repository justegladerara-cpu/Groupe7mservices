import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator as CalcIcon, Check, Link2, Truck } from 'lucide-react'
import { useStore } from '../../lib/store'
import { allInclusiveUnitPrice, unitCostParts } from '../../lib/pricing'
import { useMoney, fmtDate } from '../../lib/format'
import { Field } from '../../components/ui'
import { WEIGHTS } from './LinkOrder'

const CURRENCIES: Record<string, number> = { 'USD ($)': 1, 'EUR (€)': 1.08 }

export default function CalculatorPage() {
  const settings = useStore((s) => s.settings)
  const money = useMoney()
  const [price, setPrice] = useState('19.99')
  const [cur, setCur] = useState('USD ($)')
  const [kind, setKind] = useState('Vêtement')
  const [qty, setQty] = useState(1)
  const usd = (Number(price) || 0) * CURRENCIES[cur]
  const w = WEIGHTS[kind]
  const unit = usd > 0 ? allInclusiveUnitPrice(usd, w, settings) : 0
  const parts = unitCostParts(usd, w, settings)
  const items = unit * qty
  const relayFree = items >= settings.freeRelayThreshold
  const min = new Date(); min.setDate(min.getDate() + settings.standardDaysMin)
  const max = new Date(); max.setDate(max.getDate() + settings.standardDaysMax)
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-900"><CalcIcon /></div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calculateur de prix d’import</h1>
          <p className="text-sm text-slate-500">Combien coûte vraiment un article vu sur SHEIN, AliExpress ou Temu, livré au Congo ?</p>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card space-y-4 p-5">
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field label="Prix affiché sur le site"><input id="calc-price" className="input text-lg font-semibold" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="Devise"><select id="calc-cur" className="input" value={cur} onChange={(e) => setCur(e.target.value)}>{Object.keys(CURRENCIES).map((c) => <option key={c}>{c}</option>)}</select></Field>
          </div>
          <Field label="Type d’article" hint={`Poids estimé : ${w} kg`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.keys(WEIGHTS).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-xl border px-2 py-2 text-xs font-semibold ${kind === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-600'}`}>{k}</button>)}
            </div>
          </Field>
          <Field label="Quantité"><input id="calc-qty" className="input" type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} /></Field>
        </div>
        <div className="card overflow-hidden">
          <div className="bg-slate-900 p-5 text-white">
            <div className="text-xs uppercase tracking-wide text-slate-400">Prix tout compris, livré au Congo</div>
            <div className="mt-1 text-4xl font-extrabold tabular-nums">{money(items)}</div>
            <div className="text-sm text-slate-300">{qty > 1 ? `${money(unit)} l’unité · ` : ''}+ livraison {relayFree ? 'point relais offerte' : `dès ${money(settings.relayDeliveryFee)}`}</div>
          </div>
          <div className="space-y-2 p-5 text-sm">
            {[['Article', parts.product], ['Transport international', parts.transport], ['Douane', parts.customs], ['Service HHHGroup (achat, suivi, garantie)', parts.service]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between"><span className="flex items-center gap-2 text-slate-600"><Check size={14} className="text-emerald-600" />{l}</span><span className="tabular-nums">{money((v as number) * qty)}</span></div>
            ))}
            <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-brand-900"><Truck size={16} className="mt-0.5 shrink-0" />Livraison estimée entre le {fmtDate(min.toISOString())} et le {fmtDate(max.toISOString())}.</div>
            <p className="text-xs text-slate-500">Estimation indicative, arrondie. Le prix définitif est confirmé par l’équipe avant paiement, sans surprise ensuite.</p>
            <Link to="/lien" className="btn-primary w-full py-3"><Link2 size={16} />Commander cet article avec son lien</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
