import { Link } from 'react-router-dom'
import type { Product } from '../lib/types'
import ProductVisual from './ProductVisual'
import { useStore } from '../lib/store'
import { allInclusiveUnitPrice } from '../lib/pricing'
import { useMoney } from '../lib/format'
import { Stars } from './ui'

export default function ProductCard({ p }: { p: Product }) {
  const settings = useStore((s) => s.settings)
  const reviews = useStore((s) => s.reviews.filter((r) => r.productId === p.id && r.status === 'publie'))
  const money = useMoney()
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0
  return (
    <Link to={`/produit/${p.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        <ProductVisual glyph={p.glyph} hue={p.hue} image={p.image} className="transition duration-300 group-hover:scale-105" />
        {p.featured && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800">Tendance</span>}
      </div>
      <div className="p-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{p.category}</div>
        <div className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800">{p.name}</div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-base font-bold text-brand-800">{money(allInclusiveUnitPrice(p.supplierPriceUsd, p.weightKg, settings))}</div>
            <div className="text-[10px] font-medium text-emerald-700">Tout compris · douane incluse</div>
          </div>
          {reviews.length > 0 && <div className="flex flex-col items-end"><Stars value={Math.round(avg)} size={11} /><span className="text-[10px] text-slate-400">{reviews.length} avis</span></div>}
        </div>
      </div>
    </Link>
  )
}
